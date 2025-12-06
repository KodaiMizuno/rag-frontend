import os
import base64
import tarfile
import io

def setup_oracle_wallet():
    """
    Decodes base64-encoded wallet for cloud deployment
    Falls back to local wallet_dir for development
    """
    wallet_base64 = os.getenv("WALLET_BASE64")
    
    if wallet_base64:
        print("📦 Setting up Oracle Wallet from base64...")
        wallet_dir = "/tmp/wallet"
        os.makedirs(wallet_dir, exist_ok=True)
        
        try:
            # Decode and extract wallet files
            wallet_data = base64.b64decode(wallet_base64)
            tar = tarfile.open(fileobj=io.BytesIO(wallet_data), mode='r:gz')
            tar.extractall(wallet_dir)
            tar.close()
            
            print(f"✅ Wallet extracted to {wallet_dir}")
            
            # Update environment for DatabaseManager
            os.environ["ADB_WALLET_PATH"] = wallet_dir
            return wallet_dir
        except Exception as e:
            print(f"❌ Wallet setup failed: {e}")
            raise e
    else:
        # Local development - use existing wallet_dir
        print("🔧 Using local wallet_dir")
        return os.getenv("ADB_WALLET_PATH", "./wallet_dir")
