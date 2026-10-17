package com.devflow.auth.oauth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

public interface OAuthLoginCodeRepository extends JpaRepository<OAuthLoginCode, String> {

    /** 아직 유효한 code만 지운다. 1이면 이번 요청이 처음 사용한 것 (동시에 두 번 써도 한 번만 성공) */
    @Modifying
    @Query("delete from OAuthLoginCode c where c.codeHash = :hash and c.expiresAt > :now")
    int consume(@Param("hash") String hash, @Param("now") LocalDateTime now);

    @Transactional
    @Modifying
    @Query("delete from OAuthLoginCode c where c.expiresAt <= :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}
