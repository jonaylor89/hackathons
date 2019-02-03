package com.example.audiome_android;

import android.media.MediaPlayer;

import java.io.IOException;

public class MP3Player {
    private String MP3Link;
    private MediaPlayer mediaPlayer;

    public MP3Player(String url) {
        MP3Link = url;
        mediaPlayer = new MediaPlayer();
    }

    public boolean play() {
        try {
            mediaPlayer.setDataSource(MP3Link);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (IOException io) {
            io.printStackTrace();
        }

        return true;
    }
}
