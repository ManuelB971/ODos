<?php

declare(strict_types=1);

namespace App\Tests;

use App\Security\AdminIntendedPathResolver;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpFoundation\Session\Storage\MockArraySessionStorage;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

final class AdminIntendedPathResolverTest extends TestCase
{
    public function testRememberAndResolveBadgeEditPath(): void
    {
        $resolver = new AdminIntendedPathResolver();
        $request = $this->requestWithSession('/admin/badge-definition/1/edit');
        $resolver->rememberCurrentPath($request);

        $urlGenerator = $this->createMock(UrlGeneratorInterface::class);
        $urlGenerator->expects(self::never())->method('generate');

        self::assertSame('/admin/badge-definition/1/edit', $resolver->resolve($request, $urlGenerator));
    }

    public function testResolveFallsBackToSymfonyTargetPath(): void
    {
        $resolver = new AdminIntendedPathResolver();
        $request = $this->requestWithSession('/admin');
        $request->getSession()->set('_security.main.target_path', '/admin/badge-definition/2/edit');

        $urlGenerator = $this->createMock(UrlGeneratorInterface::class);
        $urlGenerator->expects(self::never())->method('generate');

        self::assertSame('/admin/badge-definition/2/edit', $resolver->resolve($request, $urlGenerator));
    }

    public function testUnsafePathFallsBackToDashboard(): void
    {
        $resolver = new AdminIntendedPathResolver();
        $request = $this->requestWithSession('/admin');
        $request->getSession()->set(AdminIntendedPathResolver::SESSION_KEY, '/admin/mfa');

        $urlGenerator = $this->createMock(UrlGeneratorInterface::class);
        $urlGenerator->expects(self::once())->method('generate')->with('admin')->willReturn('/admin');

        self::assertSame('/admin', $resolver->resolve($request, $urlGenerator));
    }

    private function requestWithSession(string $uri): Request
    {
        $request = Request::create($uri);
        $session = new Session(new MockArraySessionStorage());
        $session->start();
        $request->setSession($session);

        return $request;
    }
}
