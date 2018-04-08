import roombaApi as roomba
import threading
import time

def targetDetect():
	roomba.onTargetAcquired()

targeting = threading.Thread(name="Targeting Thread", target=targetDetect)

roomba.initialize()
targeting.start()

targeting.join()
roomba.shutdown()
