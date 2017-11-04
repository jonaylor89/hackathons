# Start standard library injections.
from time import sleep

# End standard library injections.


BASE_DIR_STRING = '/sys/bus/w1/devices/'
DEVICE_FILE_PATH_STRING = '28-80000008d65c/w1_slave'


def read_file(filepathstring):
    with open(filepathstring, 'r') as infile:
        wholefilestring = infile.read()
    return wholefilestring


def read_temperature():
    wholefilestring = read_file(BASE_DIR_STRING + DEVICE_FILE_PATH_STRING)
    if 'YES' in wholefilestring:
        temperature_start_index_int = wholefilestring.find('t=')
        if temperature_start_index_int != -1:
            currenttempstring = wholefilestring[temperature_start_index_int + 2:]
            return currenttempstring.strip()


if __name__ == "__main__":
    print(str(calendar.timegm(time.gmtime())) + ',' + str(read_temp()))
