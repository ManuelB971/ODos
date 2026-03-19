<?php

namespace App\EventSubscriber;

use ApiPlatform\Validator\Exception\ValidationException;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;

class ExceptionSubscriber implements EventSubscriberInterface
{
    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();
        
        // Only format API responses
        if (strpos($request->getPathInfo(), '/api/') !== 0) {
            return;
        }

        $exception = $event->getThrowable();
        
        $message = $exception->getMessage();
        $code = Response::HTTP_INTERNAL_SERVER_ERROR;
        $details = [];

        if ($exception instanceof HttpExceptionInterface) {
            $code = $exception->getStatusCode();
        }

        if ($exception instanceof ValidationException) {
            $code = Response::HTTP_UNPROCESSABLE_ENTITY;
            $message = 'Erreur de validation.';
            
            $violations = $exception->getConstraintViolationList();
            foreach ($violations as $violation) {
                $details[] = [
                    'property' => $violation->getPropertyPath(),
                    'message' => $violation->getMessage(),
                ];
            }
        }

        // For other types of exceptions where you might want specific code
        if ($code >= 500 && $_ENV['APP_ENV'] !== 'dev') {
            $message = 'Une erreur interne est survenue.';
        }

        $responseData = [
            'message' => $message,
            'code' => $code,
            'details' => $details,
        ];

        $response = new JsonResponse($responseData, $code);
        $event->setResponse($response);
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => ['onKernelException', 200], // Priority > 0 to override API Platform listener
        ];
    }
}
