
from distutils.core import setup
from distutils.extension import Extension
from Cython.Build import cythonize
from ctypes.util import find_library

sourcefiles = ['Kinect2Py.pyx', 'kinect_start.c']
extensions = [Extension("Kinect2Py", sourcefiles)]
ext_modules=[
	Extension("Kinect2Py", sources=["Kinect2Py.pyx"],
	libraries=["kinect_start.so"])]

setup(name='Kinect2Py',
    ext_modules = cythonize(extensions)
)
