import oci

signer = oci.auth.signers.get_resource_principals_signer()
object_storage = oci.object_storage.ObjectStorageClient(config={}, signer=signer)

namespace = "axznq7daacjc"
compartment_id = "ocid1.compartment.oc1..aaaaaaaap2ptvrzwsbydpejxmdovxsohw4vfa3z7iqi36z6qdaf2jvdyvpxa"

print("✅ Testing Object Storage access...")
response = object_storage.list_buckets(namespace, compartment_id)

for b in response.data:
    print(f"- Bucket: {b.name}")

print("\n✅ Connection successful!")
