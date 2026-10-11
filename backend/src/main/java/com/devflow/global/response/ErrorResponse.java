package com.devflow.global.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ErrorResponse {

    private boolean success;
    private String message;
    private String code;
    private Object data;

    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(false, message, code, null);
    }
}