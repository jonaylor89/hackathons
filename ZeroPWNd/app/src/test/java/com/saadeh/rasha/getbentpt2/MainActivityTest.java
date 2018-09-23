package com.saadeh.rasha.getbentpt2;

import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mockito;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;

import java.io.IOException;

import okhttp3.*;

import okhttp3.Response;

import static org.junit.Assert.*;

public class MainActivityTest {
    @Rule
    public MockitoRule mockitoRule = MockitoJUnit.rule();

    @Test
    public void test1() throws IOException {
        Response response = new Response();
        int expected = Integer.parseInt(Integer.toString(response.body().string().length()));
        int actual = 2;

        Assert.assertEquals(expected,actual);
    }

}