package com.example.audiome_android;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Path;

public interface GitHubClient {
    @GET("/users/{dragonfury24}/repos")
    Call<List<GitHubRepo>> reposForUser(
            @Path("dragonfury24") String user
    );


}