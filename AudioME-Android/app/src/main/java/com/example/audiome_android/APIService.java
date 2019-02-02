package com.example.audiome_android;

import retrofit2.http.GET;
import retrofit2.http.Path;

public interface APIService {
    @GET("users/{user}/repos")
    Call<List<Repo>> listRepos(@Path("user") String user);
}
