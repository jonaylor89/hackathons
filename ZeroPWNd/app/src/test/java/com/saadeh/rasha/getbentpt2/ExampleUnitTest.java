package com.saadeh.rasha.getbentpt2;

import org.junit.Before;
import org.junit.Test;

import static org.junit.Assert.*;

/**
 * Example local unit test, which will execute on the development machine (host).
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
public class ExampleUnitTest {

    
    @Before
    public void setUp{
        MainActivity mainActivity = new MainActivity();
        mainActivity.
    }
    @Test
    public void addition_isCorrect() {
        assertEquals(4, 2 + 2);
    }


    @Test
    public void testSuccess(){
        MainActivity mainActivity = new MainActivity();

        String actualResponse = mainActivity.parseResponse();
        String successfulResult = "[]";
        assertEquals(successfulResult, actualResponse)
    }



}
