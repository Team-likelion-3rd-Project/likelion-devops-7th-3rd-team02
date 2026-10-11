package com.devflow.global.exception;

import com.devflow.global.response.ErrorResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;

@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(BusinessException.class)
        public ResponseEntity<ErrorResponse> handleBusinessException(
                        BusinessException exception) {
                ErrorCode errorCode = exception.getErrorCode();

                return ResponseEntity
                                .status(errorCode.getStatus())
                                .body(
                                                ErrorResponse.of(
                                                                errorCode.getCode(),
                                                                errorCode.getMessage()));
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ErrorResponse> handleException(
                        Exception exception) {
                ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;

                return ResponseEntity
                                .status(errorCode.getStatus())
                                .body(
                                                ErrorResponse.of(
                                                                errorCode.getCode(),
                                                                errorCode.getMessage()));
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ErrorResponse> handleValidationException(
                        MethodArgumentNotValidException exception) {
                String message = exception.getBindingResult()
                                .getFieldErrors()
                                .stream()
                                .findFirst()
                                .map(error -> error.getDefaultMessage())
                                .orElse("잘못된 요청입니다.");

                ErrorCode errorCode = ErrorCode.INVALID_REQUEST;

                return ResponseEntity
                                .status(errorCode.getStatus())
                                .body(
                                                ErrorResponse.of(
                                                                errorCode.getCode(),
                                                                message));
        }
}