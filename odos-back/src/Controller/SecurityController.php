<?php

namespace App\Controller;

use App\Security\AdminMfaService;
use App\Security\AdminSmsOtpService;
use App\Service\AdminAuditLogger;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;

class SecurityController extends AbstractController
{
    private const SESSION_MFA_PASS_KEY = 'admin_mfa_passed';
    private const SESSION_TOTP_OK_KEY = 'admin_mfa_totp_ok';
    private const SESSION_SMS_HASH_KEY = 'admin_mfa_sms_hash';
    private const SESSION_SMS_EXPIRES_KEY = 'admin_mfa_sms_expires';
    private const SESSION_TOTP_ATTEMPTS_KEY = 'admin_mfa_totp_attempts';
    private const SESSION_SMS_ATTEMPTS_KEY = 'admin_mfa_sms_attempts';
    private const SESSION_TOTP_LOCK_UNTIL_KEY = 'admin_mfa_totp_lock_until';
    private const SESSION_SMS_LOCK_UNTIL_KEY = 'admin_mfa_sms_lock_until';
    private const MAX_TOTP_ATTEMPTS = 5;
    private const MAX_SMS_ATTEMPTS = 5;
    private const LOCK_DURATION_SECONDS = 900;

    #[Route(path: '/login', name: 'app_login')]
    public function login(AuthenticationUtils $authenticationUtils): Response
    {
        if ($this->getUser()) {
            if ($this->isGranted('ROLE_ADMIN') && !$this->getSessionFlag()) {
                return $this->redirectToRoute('app_admin_mfa');
            }

            return $this->redirectToRoute('admin');
        }

        // get the login error if there is one
        $error = $authenticationUtils->getLastAuthenticationError();
        // last username entered by the user
        $lastUsername = $authenticationUtils->getLastUsername();

        return $this->render('security/login.html.twig', ['last_username' => $lastUsername, 'error' => $error]);
    }

    #[Route(path: '/admin/mfa', name: 'app_admin_mfa', methods: ['GET', 'POST'])]
    public function adminMfa(
        Request $request,
        AdminMfaService $adminMfaService,
        AdminSmsOtpService $smsOtpService,
        AdminAuditLogger $adminAuditLogger,
    ): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_login');
        }

        $session = $request->getSession();
        if ($session->get(self::SESSION_MFA_PASS_KEY, false)) {
            return $this->redirectToRoute('admin');
        }

        $error = null;
        $info = null;
        $totpVerified = (bool) $session->get(self::SESSION_TOTP_OK_KEY, false);

        if ($request->isMethod('POST')) {
            $csrfToken = (string) $request->request->get('_csrf_token', '');
            $action = (string) $request->request->get('action', 'validate');

            if (!$this->isCsrfTokenValid('admin_mfa', $csrfToken)) {
                $error = 'Session expiree. Veuillez reessayer.';
            } elseif ($action === 'validate_totp') {
                $lockUntil = (int) $session->get(self::SESSION_TOTP_LOCK_UNTIL_KEY, 0);
                if ($lockUntil > time()) {
                    $error = sprintf('Trop de tentatives TOTP. Reessayez dans %d secondes.', $lockUntil - time());
                    $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Tentative TOTP bloquée (lock actif)', 'warning');
                } elseif (!$adminMfaService->isConfigured()) {
                    $error = 'Google Authenticator non configure.';
                    $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Tentative TOTP refusée: TOTP non configuré', 'warning');
                } else {
                    $totpCode = (string) $request->request->get('totp_code', '');
                    if (!$adminMfaService->isTotpValid($totpCode)) {
                        $attempts = (int) $session->get(self::SESSION_TOTP_ATTEMPTS_KEY, 0) + 1;
                        $session->set(self::SESSION_TOTP_ATTEMPTS_KEY, $attempts);
                        if ($attempts >= self::MAX_TOTP_ATTEMPTS) {
                            $session->set(self::SESSION_TOTP_LOCK_UNTIL_KEY, time() + self::LOCK_DURATION_SECONDS);
                            $session->set(self::SESSION_TOTP_ATTEMPTS_KEY, 0);
                            $error = 'Trop de tentatives TOTP. Acces temporairement bloque.';
                            $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Tentative TOTP invalide: blocage temporaire', 'warning');
                        } else {
                            $remaining = self::MAX_TOTP_ATTEMPTS - $attempts;
                            $error = sprintf('Code Google Authenticator invalide. Tentatives restantes: %d.', $remaining);
                            $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, sprintf('Tentative TOTP invalide (restant: %d)', $remaining), 'warning');
                        }
                    } else {
                        $session->set(self::SESSION_TOTP_OK_KEY, true);
                        $session->set(self::SESSION_TOTP_ATTEMPTS_KEY, 0);
                        $session->remove(self::SESSION_TOTP_LOCK_UNTIL_KEY);
                        $totpVerified = true;
                        $info = 'Google Authenticator valide. Vous pouvez maintenant valider le SMS.';
                        $adminAuditLogger->log('MFA_SUCCESS', 'MFA', null, 'Étape TOTP validée', 'info');
                    }
                }
            } elseif ($action === 'send_sms') {
                if (!$totpVerified) {
                    $error = 'Validation Google Authenticator requise avant envoi SMS.';
                } elseif ((int) $session->get(self::SESSION_SMS_LOCK_UNTIL_KEY, 0) > time()) {
                    $error = sprintf(
                        'Trop de tentatives SMS. Reessayez dans %d secondes.',
                        (int) $session->get(self::SESSION_SMS_LOCK_UNTIL_KEY, 0) - time()
                    );
                    $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Demande envoi SMS refusée: lock actif', 'warning');
                } else {
                    $admin = $this->getAdminUser();
                    $phone = $admin->getPhoneNumber();
                    if (!is_string($phone) || trim($phone) === '') {
                        $error = 'Numero de telephone manquant pour cet admin.';
                    } elseif (!$smsOtpService->isConfigured()) {
                        $error = 'Configuration SMS manquante (Twilio).';
                    } else {
                        try {
                            $code = $smsOtpService->generateOtp();
                            $smsOtpService->sendOtp($phone, $code);
                            $session->set(self::SESSION_SMS_HASH_KEY, $smsOtpService->hashOtp($code));
                            $session->set(self::SESSION_SMS_EXPIRES_KEY, time() + 300);
                            $session->set(self::SESSION_SMS_ATTEMPTS_KEY, 0);
                            $info = 'Code SMS envoye. Il expire dans 5 minutes.';
                            $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Code SMS envoyé pour MFA admin', 'info');
                        } catch (\Throwable $e) {
                            $error = 'Echec envoi SMS. Veuillez reessayer.';
                            $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Echec envoi code SMS MFA', 'warning');
                        }
                    }
                }
            } else {
                $smsCode = (string) $request->request->get('sms_code', '');
                $hash = (string) $session->get(self::SESSION_SMS_HASH_KEY, '');
                $expires = (int) $session->get(self::SESSION_SMS_EXPIRES_KEY, 0);

                if ((int) $session->get(self::SESSION_SMS_LOCK_UNTIL_KEY, 0) > time()) {
                    $error = sprintf(
                        'Trop de tentatives SMS. Reessayez dans %d secondes.',
                        (int) $session->get(self::SESSION_SMS_LOCK_UNTIL_KEY, 0) - time()
                    );
                    $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Validation SMS refusée: lock actif', 'warning');
                } elseif (!$totpVerified) {
                    $error = 'Validation Google Authenticator requise.';
                    $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Validation SMS refusée: TOTP non validé', 'warning');
                } elseif ($hash === '' || $expires <= time()) {
                    $error = 'Code SMS absent ou expire. Renvoyez un code.';
                    $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Validation SMS refusée: code absent/expiré', 'warning');
                } elseif (!$smsOtpService->verifyOtp($smsCode, $hash)) {
                    $attempts = (int) $session->get(self::SESSION_SMS_ATTEMPTS_KEY, 0) + 1;
                    $session->set(self::SESSION_SMS_ATTEMPTS_KEY, $attempts);
                    if ($attempts >= self::MAX_SMS_ATTEMPTS) {
                        $session->set(self::SESSION_SMS_LOCK_UNTIL_KEY, time() + self::LOCK_DURATION_SECONDS);
                        $session->set(self::SESSION_SMS_ATTEMPTS_KEY, 0);
                        $error = 'Trop de tentatives SMS. Acces temporairement bloque.';
                        $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, 'Code SMS invalide: blocage temporaire', 'warning');
                    } else {
                        $remaining = self::MAX_SMS_ATTEMPTS - $attempts;
                        $error = sprintf('Code SMS invalide. Tentatives restantes: %d.', $remaining);
                        $adminAuditLogger->log('MFA_ATTEMPT', 'MFA', null, sprintf('Code SMS invalide (restant: %d)', $remaining), 'warning');
                    }
                } else {
                    $session->set(self::SESSION_MFA_PASS_KEY, true);
                    $session->remove(self::SESSION_TOTP_OK_KEY);
                    $session->remove(self::SESSION_SMS_HASH_KEY);
                    $session->remove(self::SESSION_SMS_EXPIRES_KEY);
                    $session->remove(self::SESSION_SMS_ATTEMPTS_KEY);
                    $session->remove(self::SESSION_SMS_LOCK_UNTIL_KEY);
                    $session->remove(self::SESSION_TOTP_ATTEMPTS_KEY);
                    $session->remove(self::SESSION_TOTP_LOCK_UNTIL_KEY);
                    $adminAuditLogger->log('MFA_SUCCESS', 'MFA', null, 'MFA admin validée (TOTP + SMS)', 'info');

                    return $this->redirectToRoute('admin');
                }
            }
        }

        $admin = $this->getAdminUser();
        $phone = $admin->getPhoneNumber();
        $maskedPhone = is_string($phone) && strlen($phone) >= 4
            ? str_repeat('*', max(strlen($phone) - 4, 0)).substr($phone, -4)
            : null;
        return $this->render('security/admin_mfa.html.twig', [
            'error' => $error,
            'info' => $info,
            'totp_verified' => $totpVerified,
            'masked_phone' => $maskedPhone,
        ]);
    }

    #[Route(path: '/admin/mfa/totp/setup', name: 'app_admin_mfa_totp_setup', methods: ['GET', 'POST'])]
    public function adminMfaTotpSetup(Request $request, AdminMfaService $adminMfaService): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_login');
        }

        $error = null;
        $info = null;
        $admin = $this->getAdminUser();
        $account = (string) $admin->getEmail();

        try {
            $otpauthUri = $adminMfaService->buildTotpUri($account);
        } catch (\Throwable) {
            $otpauthUri = '';
            $error = 'Configuration TOTP manquante. Definis ADMIN_MFA_TOTP_SECRET.';
        }

        if ($request->isMethod('POST')) {
            $csrfToken = (string) $request->request->get('_csrf_token', '');
            $code = (string) $request->request->get('totp_code', '');

            if (!$this->isCsrfTokenValid('admin_mfa_totp_setup', $csrfToken)) {
                $error = 'Session expiree. Veuillez reessayer.';
            } elseif ($otpauthUri === '') {
                $error = 'Configuration TOTP indisponible.';
            } elseif (!$adminMfaService->isTotpValid($code)) {
                $error = 'Code Google Authenticator invalide.';
            } else {
                $info = 'Google Authenticator est correctement configure.';
            }
        }

        return $this->render('security/admin_mfa_totp_setup.html.twig', [
            'error' => $error,
            'info' => $info,
            'account' => $account,
            'otpauth_uri' => $otpauthUri,
        ]);
    }

    #[Route(path: '/logout', name: 'app_logout')]
    public function logout(): void
    {
        throw new \LogicException('This method can be blank - it will be intercepted by the logout key on your firewall.');
    }

    private function getSessionFlag(): bool
    {
        $request = $this->container->get('request_stack')->getCurrentRequest();

        return null !== $request && $request->hasSession() && $request->getSession()->get(self::SESSION_MFA_PASS_KEY, false);
    }

    private function getAdminUser(): \App\Entity\User
    {
        $user = $this->getUser();
        if (!$user instanceof \App\Entity\User) {
            throw new \RuntimeException('Aucun admin authentifie.');
        }

        return $user;
    }
}
