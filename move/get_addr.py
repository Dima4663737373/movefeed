import hashlib

pub_hex = "85D293622C6A936F7335ADD27A129DCB8D5A67F70E37636CA27E1596D8AE2960"
pub_bytes = bytes.fromhex(pub_hex)
# Append 0x00 for Ed25519 scheme
data = pub_bytes + b'\x00'
addr = hashlib.sha3_256(data).hexdigest()
print(f"0x{addr}")
