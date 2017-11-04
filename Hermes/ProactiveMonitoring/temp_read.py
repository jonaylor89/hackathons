import time

#os.system('modprobe w1-gpio')
#os.system('modprobe w1-therm')


base_dir = '/sys/bus/w1/devices/'
device_file = '28-80000008d65c/w1_slave'
def read_temp_raw():
    with open(base_dir + device_file,'r') as infile:
        lines = infile.readlines()
    return lines

def read_temp():
    lines = read_temp_raw()
    while lines[0].strip()[-3:] != 'YES' :
        time.sleep(0.2)
        lines = read_temp_raw()
    equals_pos = lines[1].find('t=')
    if equals_pos != -1:
        temp_string = lines[1][equals_pos + 2:]
        temp_c = float(temp_string) / 1000.0
        temp_f = temp_c * 9.0 / 5.0 + 32
        return str(temp_f)

if __name__ == "__main__":
    while True:
        print(read_temp())
        time.sleep(1)

