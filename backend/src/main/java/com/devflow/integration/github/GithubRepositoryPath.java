package com.devflow.integration.github;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** https://github.com/{owner}/{repo} (끝의 .git, / 허용) → owner/repo (G1) */
public final class GithubRepositoryPath {

    private static final Pattern URL = Pattern.compile(
            "^https?://(?:www\\.)?github\\.com/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))/([A-Za-z0-9._-]{1,100}?)(?:\\.git)?/?$");

    private GithubRepositoryPath() {
    }

    public static String parse(String repositoryUrl) {
        Matcher matcher = URL.matcher(repositoryUrl == null ? "" : repositoryUrl.trim());
        if (!matcher.matches()) {
            throw new BusinessException(ErrorCode.INVALID_REPOSITORY_URL);
        }
        String repo = matcher.group(2);
        if (repo.equals(".") || repo.equals("..")) {
            throw new BusinessException(ErrorCode.INVALID_REPOSITORY_URL);
        }
        return matcher.group(1) + "/" + repo;
    }
}
