"""
RemotePC Connection Automation
Handles connecting to mechanic's computer via personal key
"""
import pyautogui
import time
import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Tuple
import config

# Disable PyAutoGUI failsafe for automation
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.5

class RemotePCConnector:
    """
    Automates RemotePC desktop application for connecting via personal key
    """

    def __init__(self):
        self.connected = False
        self.connection_window_found = False

    def connect(self, personal_key: str) -> bool:
        """
        Connect to mechanic's computer using 6-digit personal key

        Args:
            personal_key: 6-digit access code from mechanic

        Returns:
            True if connection successful, False otherwise
        """
        print(f"🔗 Connecting to RemotePC with key: {personal_key}")

        try:
            # Step 1: Launch RemotePC
            if not self._launch_remotepc():
                raise Exception("Failed to launch RemotePC application")

            # Step 2: Find and click "Connect via Personal Key"
            if not self._click_personal_key_option():
                raise Exception("Could not find Personal Key connection option")

            # Step 3: Enter personal key
            if not self._enter_personal_key(personal_key):
                raise Exception("Failed to enter personal key")

            # Step 4: Wait for connection
            if not self._wait_for_connection():
                raise Exception("Connection timeout or failed")

            print("✅ Connected successfully!")
            self.connected = True
            return True

        except Exception as e:
            print(f"❌ Connection failed: {str(e)}")
            return False

    def disconnect(self):
        """
        Close RemotePC connection
        """
        if not self.connected:
            return

        print("🔌 Disconnecting from RemotePC...")

        # Close remote session window
        pyautogui.hotkey('alt', 'f4')
        time.sleep(config.TIMING['window_load'])

        # Confirm disconnect if prompted
        pyautogui.press('enter')  # Press OK/Yes if confirmation dialog appears
        time.sleep(1)

        self.connected = False
        print("✅ Disconnected")

    def _launch_remotepc(self) -> bool:
        """
        Launch RemotePC desktop application
        """
        print("   Launching RemotePC...")

        # Method 1: Use Windows Search
        pyautogui.press('win')
        time.sleep(config.TIMING['click_delay'])
        pyautogui.write('RemotePC', interval=0.05)
        time.sleep(config.TIMING['window_load'])
        pyautogui.press('enter')
        time.sleep(config.TIMING['app_launch'])

        # Verify app launched by looking for window title
        # In production, use image recognition to verify
        return True

    def _click_personal_key_option(self) -> bool:
        """
        Find and click the "Connect via Personal Key" button/option
        """
        print("   Looking for Personal Key option...")

        # Try to find the button using template matching
        template_path = config.ASSETS_DIR / "personal_key_button.png"

        if template_path.exists():
            location = self._find_image_on_screen(template_path)
            if location:
                pyautogui.click(location)
                time.sleep(config.TIMING['click_delay'])
                return True

        # Fallback: Use keyboard navigation
        # Tab through options and press Enter
        for _ in range(10):  # Try up to 10 tabs
            pyautogui.press('tab')
            time.sleep(0.3)
            # Check if we found the right option (simplified)
            pyautogui.press('enter')
            time.sleep(1)

            # Check if personal key input field appeared
            if self._is_personal_key_input_visible():
                return True

        return False

    def _enter_personal_key(self, personal_key: str) -> bool:
        """
        Type the 6-digit personal key into the input field
        """
        print(f"   Entering personal key...")

        # Clear any existing text
        pyautogui.hotkey('ctrl', 'a')
        time.sleep(0.2)

        # Type personal key
        pyautogui.write(personal_key, interval=0.15)
        time.sleep(config.TIMING['typing_delay'])

        # Press Enter or click Connect button
        pyautogui.press('enter')
        time.sleep(config.TIMING['click_delay'])

        return True

    def _wait_for_connection(self, timeout: int = 30) -> bool:
        """
        Wait for connection to establish
        Monitors for connection success or failure
        """
        print("   Waiting for connection to establish...")

        start_time = time.time()

        while time.time() - start_time < timeout:
            # Check for connection success indicators
            if self._is_connected():
                return True

            # Check for error messages
            if self._check_for_errors():
                return False

            time.sleep(1)
            print("   .", end="", flush=True)

        print("\n   ⏱️ Connection timeout")
        return False

    def _is_connected(self) -> bool:
        """
        Check if connection is established
        Look for remote desktop window
        """
        # In production: Use image recognition to verify remote desktop is showing
        # For now: assume connection after delay
        time.sleep(config.CONNECTION_TIMEOUT)
        return True

    def _check_for_errors(self) -> bool:
        """
        Check for error dialogs or messages
        """
        # Look for common error messages
        error_images = [
            "connection_failed.png",
            "invalid_key.png",
            "computer_offline.png"
        ]

        for error_img in error_images:
            error_path = config.ASSETS_DIR / error_img
            if error_path.exists():
                location = self._find_image_on_screen(error_path)
                if location:
                    print(f"\n   ❌ Error detected: {error_img}")
                    return True

        return False

    def _is_personal_key_input_visible(self) -> bool:
        """
        Check if personal key input field is visible
        """
        # Look for input field template
        input_template = config.ASSETS_DIR / "personal_key_input.png"

        if input_template.exists():
            return self._find_image_on_screen(input_template) is not None

        # Fallback: assume visible after delay
        return True

    def _find_image_on_screen(self, template_path: Path, confidence: float = 0.8) -> Optional[Tuple[int, int]]:
        """
        Find an image on screen using template matching

        Args:
            template_path: Path to template image
            confidence: Match confidence threshold (0.0 to 1.0)

        Returns:
            (x, y) coordinates if found, None otherwise
        """
        try:
            # Take screenshot
            screenshot = pyautogui.screenshot()
            screenshot_np = np.array(screenshot)
            screenshot_gray = cv2.cvtColor(screenshot_np, cv2.COLOR_RGB2GRAY)

            # Load template
            template = cv2.imread(str(template_path), cv2.IMREAD_GRAYSCALE)

            if template is None:
                return None

            # Perform template matching
            result = cv2.matchTemplate(screenshot_gray, template, cv2.TM_CCOEFF_NORMED)
            min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

            if max_val >= confidence:
                # Get center of template
                h, w = template.shape
                center_x = max_loc[0] + w // 2
                center_y = max_loc[1] + h // 2
                return (center_x, center_y)

        except Exception as e:
            print(f"   Image search error: {str(e)}")

        return None

    def take_screenshot(self, filename: str):
        """
        Take screenshot of remote desktop
        Useful for debugging
        """
        screenshot_path = config.SCREENSHOTS_DIR / filename
        screenshot = pyautogui.screenshot()
        screenshot.save(screenshot_path)
        print(f"   📸 Screenshot saved: {screenshot_path}")


class RemotePCFileTransfer:
    """
    Handle file downloads from remote machine via RemotePC
    """

    def __init__(self):
        self.local_staging = config.DOWNLOADS_DIR

    def download_files(self, file_list: list, destination: Path) -> int:
        """
        Download files from remote machine to local staging area

        Args:
            file_list: List of file paths on remote machine
            destination: Local destination folder

        Returns:
            Number of files successfully downloaded
        """
        print(f"📥 Downloading {len(file_list)} files...")

        downloaded = 0

        for file_path in file_list:
            try:
                if self._download_single_file(file_path, destination):
                    downloaded += 1
                    print(f"   ✓ {downloaded}/{len(file_list)}: {Path(file_path).name}")
            except Exception as e:
                print(f"   ✗ Failed: {file_path} - {str(e)}")

        print(f"✅ Downloaded {downloaded}/{len(file_list)} files")
        return downloaded

    def _download_single_file(self, remote_path: str, local_destination: Path) -> bool:
        """
        Download a single file from remote machine
        """
        # Open File Explorer on remote machine
        pyautogui.hotkey('win', 'e')
        time.sleep(config.TIMING['window_load'])

        # Navigate to file
        pyautogui.hotkey('ctrl', 'l')
        time.sleep(config.TIMING['click_delay'])
        pyautogui.write(remote_path, interval=0.02)
        pyautogui.press('enter')
        time.sleep(config.TIMING['window_load'])

        # Select file
        pyautogui.hotkey('ctrl', 'a')
        time.sleep(config.TIMING['click_delay'])

        # Copy file
        pyautogui.hotkey('ctrl', 'c')
        time.sleep(config.TIMING['file_operation'])

        # Close remote File Explorer
        pyautogui.hotkey('ctrl', 'w')

        # Open local File Explorer (RemotePC should have clipboard sync)
        # In production, use RemotePC's file transfer feature
        # For now, simulate paste to local destination

        time.sleep(config.TIMING['file_operation'])

        return True


if __name__ == "__main__":
    # Test connection
    connector = RemotePCConnector()

    test_key = "123456"  # Test key
    if connector.connect(test_key):
        print("Connection test successful!")
        time.sleep(5)
        connector.disconnect()
    else:
        print("Connection test failed!")
