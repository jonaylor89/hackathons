package com.example.audiome_android;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class Controller implements Callback<List<GitHubRepo>> {

    static final String BASE_URL = "https://api.github.com";

    public void start() {
        Gson gson = new GsonBuilder()
                .setLenient()
                .create();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build();

        GitHubClient gitHubClient = retrofit.create(GitHubClient.class);

        Call<List<GitHubRepo>> call = gitHubClient.reposForUser("status:open");
        call.enqueue(this);

    }

    @Override
    public void onResponse(Call<List<GitHubRepo>> call, Response<List<GitHubRepo>> response) {
        if (response.isSuccessful()) {
            List<GitHubRepo> changesList = response.body();

            for (GitHubRepo change : changesList) {
                System.out.println(change.getName());
            }
        } else {
            System.out.println(response.errorBody());
        }
    }

    @Override
    public void onFailure(Call<List<GitHubRepo>> call, Throwable t) {
        t.printStackTrace();
    }
}