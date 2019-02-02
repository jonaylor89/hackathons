package com.example.audiome_android;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.http.GET;
import retrofit2.http.Path;

public interface AudioMeClient {
    @GET("/users/{user}/repos")
    Call<List<AudioMeData>> reposForUser(
            @Path("user") String user
    );
}
