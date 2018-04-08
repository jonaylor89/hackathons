import RPi.GPIO as gpio
import time

pin = 27
relay = 17

def initialize():
    gpio.setmode(gpio.BCM)
    gpio.setup(pin,gpio.OUT)
    gpio.setup(relay,gpio.OUT)

def fire():
    initialize()
    prepareToFire()
    pwm = gpio.PWM(pin,50)
    pwm.start(2.5)
    time.sleep(1)
    pwm.ChangeDutyCycle(12.5)
    time.sleep(2)
    pwm.ChangeDutyCycle(2.5)
    time.sleep(1)
    gpio.output(relay,True)

def prepareToFire():
    gpio.output(relay,False)

initialize()
