import subprocess
import sys
import os

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_path = os.path.join(base_dir, "src", "backend", "app.py")
    python_exe = os.path.join(base_dir, "venv", "Scripts", "python.exe")
    
    if not os.path.exists(python_exe):
        python_exe = sys.executable # Fallback to current environment python
        
    print(f"Starting Flask backend server using {python_exe}...")
    print(f"Server will be available at http://127.0.0.1:5000")
    
    try:
        subprocess.run([python_exe, app_path], check=True)
    except KeyboardInterrupt:
        print("\nStopping Flask backend server.")
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == "__main__":
    main()
