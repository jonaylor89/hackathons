import serial
import time
from FileShitFuck import get_head as val

port = '/dev/serial0'
baud = 115200
s = serial.Serial(port, baud, timeout=4)

def initialize():
	sendToRoomba([128])
	sendToRoomba([131])

def roombaNumberFormat(number):
	hexlist = list(str(hex(number)))
	hexlist = hexlist[2:]
	highByte = ''
	lowByte = ''
	length = len(hexlist)

	if(length == 1):
		lowByte = int(hexlist[0],16)
	elif(length == 2):
		lowByte = int(hexlist[0]+hexlist[1],16)
	elif(length == 3):
		highByte = int(hexlist[0],16)
		lowByte = int(hexlist[1]+hexlist[2],16)
	elif(length == 4):
		highByte = int(hexlist[0]+hexlist[1],16)
		lowByte = int(hexlist[2]+hexlist[3],16)
		
	return [highByte+lowByte]	

def sendToRoomba(lst):
	stri=""
	for i in lst:
		stri = stri + str(chr(i))
	s.write(stri)

def move(velocity, radius):
	v = roombaNumberFormat(velocity)
	r = roombaNumberFormat(radius)
	sendToRoomba([137,v[0],v[1],r[0],r[1]])


def getJointToTrack():
    return val()
    
def onTargetAcquired():
    initialize()
    move(0,0)
    j = getJointToTrack()
    while(abs(j[0]) > 150):
        moveToTarget(j[0]. j[1], j[2])
        j = getJointToTrack()
    #fire()

def moveToTarget(x, z, zPixel):
    direction = 40
    if(xPixel > 320):
        direction *= -1
    move(direction, 1)
    theta = float(math.atan(x, z)*180.0/math.pi)
    t = float(theta * 23/600)
    sleep(t)
    move(0,0)
