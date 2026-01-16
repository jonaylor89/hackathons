package com.example.audiome_android;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.http.GET;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface APIService {
    @GET("users/{user}/repos")
    //void getData(@Query("link") String param1, Callback<List<AudioMeItems>> callback);
    Call<List<AudioMeItems>> listRepos(@Path("user") String user);
}
