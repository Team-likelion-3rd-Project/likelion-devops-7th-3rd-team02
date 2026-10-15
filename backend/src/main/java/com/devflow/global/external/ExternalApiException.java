package com.devflow.global.external;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;

/** 외부 시스템 호출 실패: 502 EXTERNAL_API_ERROR / 504 EXTERNAL_API_TIMEOUT */
public class ExternalApiException extends BusinessException {

    public ExternalApiException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public static ExternalApiException error(String message) {
        return new ExternalApiException(ErrorCode.EXTERNAL_API_ERROR, message);
    }

    public static ExternalApiException timeout(String message) {
        return new ExternalApiException(ErrorCode.EXTERNAL_API_TIMEOUT, message);
    }
}
