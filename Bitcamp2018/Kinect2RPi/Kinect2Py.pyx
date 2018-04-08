
from time import sleep

cdef extern from 'kinect_start.h':
    ctypedef joint_ joint

    cdef joint getHead()

    cdef struct joint_:
        int x
        int z
        int pixelx

cdef tuple struct_to_tuple(joint j):
    values = (0, 0, 0)
    
    if (&j != NULL):
        values[0] = j.x
        values[1] = j.z
        values[2] = j.pixelX

    return values


def get_joint():
    while True:
        sleep(0.1)
        yield struct_to_tuple(getHead())
         
        

         
        

        

	 
