import requests
import socketio
import asyncio
import json
import sys
from datetime import datetime
import time
import threading

class OrbitalClassroomTester:
    def __init__(self, base_url="https://virtual-classroom-28.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.socket_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.room_id = None
        self.room_code = None
        
        # Socket.IO clients for testing
        self.sio_client1 = None
        self.sio_client2 = None
        self.socket_events = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        if details and success:
            print(f"   {details}")

    def run_api_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success and response.content:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                    self.log_test(name, success, details)
                    return success, response_data
                except:
                    pass
            
            self.log_test(name, success, details)
            return success, {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        print("\n🔍 Testing Health Check...")
        success, _ = self.run_api_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        test_email = f"test_user_{int(time.time())}@example.com"
        test_data = {
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test User"
        }
        
        success, response = self.run_api_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            print(f"   Registered user: {self.user_data['name']} ({self.user_data['email']})")
        
        return success

    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n🔍 Testing User Login...")
        if not self.user_data:
            self.log_test("User Login", False, "No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_api_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Logged in user: {response['user']['name']}")
        
        return success

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        print("\n🔍 Testing Auth Me...")
        if not self.token:
            self.log_test("Auth Me", False, "No token available")
            return False
            
        success, response = self.run_api_test(
            "Auth Me",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"   Current user: {response.get('name')} ({response.get('email')})")
        
        return success

    def test_create_room(self):
        """Test room creation (teacher role)"""
        print("\n🔍 Testing Room Creation...")
        if not self.token:
            self.log_test("Create Room", False, "No token available")
            return False
            
        room_data = {
            "name": f"Test Classroom {int(time.time())}"
        }
        
        success, response = self.run_api_test(
            "Create Room",
            "POST",
            "rooms",
            200,
            data=room_data
        )
        
        if success:
            self.room_id = response.get('id')
            self.room_code = response.get('code')
            print(f"   Created room: {response.get('name')} (Code: {self.room_code})")
        
        return success

    def test_join_room(self):
        """Test room joining (student role)"""
        print("\n🔍 Testing Room Join...")
        if not self.room_code:
            self.log_test("Join Room", False, "No room code available")
            return False
            
        join_data = {
            "code": self.room_code
        }
        
        success, response = self.run_api_test(
            "Join Room",
            "POST",
            "rooms/join",
            200,
            data=join_data
        )
        
        if success:
            print(f"   Joined room: {response.get('name')} (ID: {response.get('id')})")
        
        return success

    def test_get_room(self):
        """Test get room details"""
        print("\n🔍 Testing Get Room...")
        if not self.room_id:
            self.log_test("Get Room", False, "No room ID available")
            return False
            
        success, response = self.run_api_test(
            "Get Room",
            "GET",
            f"rooms/{self.room_id}",
            200
        )
        
        return success

    def test_get_participants(self):
        """Test get room participants"""
        print("\n🔍 Testing Get Participants...")
        if not self.room_id:
            self.log_test("Get Participants", False, "No room ID available")
            return False
            
        success, response = self.run_api_test(
            "Get Participants",
            "GET",
            f"rooms/{self.room_id}/participants",
            200
        )
        
        if success:
            print(f"   Participants count: {len(response)}")
        
        return success

    def test_get_messages(self):
        """Test get room messages"""
        print("\n🔍 Testing Get Messages...")
        if not self.room_id:
            self.log_test("Get Messages", False, "No room ID available")
            return False
            
        success, response = self.run_api_test(
            "Get Messages",
            "GET",
            f"rooms/{self.room_id}/messages",
            200
        )
        
        if success:
            print(f"   Messages count: {len(response)}")
        
        return success

    def test_livekit_token(self):
        """Test LiveKit token generation"""
        print("\n🔍 Testing LiveKit Token Generation...")
        if not self.room_id:
            self.log_test("LiveKit Token", False, "No room ID available")
            return False
            
        token_data = {
            "room_id": self.room_id
        }
        
        success, response = self.run_api_test(
            "LiveKit Token",
            "POST",
            "livekit/token",
            200,
            data=token_data
        )
        
        if success:
            # Validate response structure
            required_fields = ['token', 'server_url', 'participant_identity', 'participant_name']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("LiveKit Token Validation", False, f"Missing fields: {missing_fields}")
                return False
            
            # Check if server_url matches expected LiveKit URL
            expected_url = "wss://classroom-3ntn08k8.livekit.cloud"
            if response.get('server_url') != expected_url:
                self.log_test("LiveKit Token Validation", False, f"Server URL mismatch: {response.get('server_url')}")
                return False
            
            print(f"   Token generated for: {response.get('participant_name')}")
            print(f"   Server URL: {response.get('server_url')}")
            print(f"   Participant ID: {response.get('participant_identity')}")
            
            self.log_test("LiveKit Token Validation", True, "All required fields present")
        
        return success

    def test_mute_all_endpoint(self):
        """Test teacher mute-all functionality"""
        print("\n🔍 Testing Mute All Endpoint...")
        if not self.room_id:
            self.log_test("Mute All", False, "No room ID available")
            return False
            
        success, response = self.run_api_test(
            "Mute All",
            "POST",
            f"rooms/{self.room_id}/mute-all",
            200
        )
        
        if success:
            # Validate response structure
            if 'success' in response and 'muted_count' in response:
                print(f"   Muted count: {response.get('muted_count', 0)}")
                print(f"   Message: {response.get('message', 'N/A')}")
                self.log_test("Mute All Response Validation", True, "Response structure valid")
            else:
                self.log_test("Mute All Response Validation", False, "Invalid response structure")
                return False
        
        return success

    def test_get_livekit_participants(self):
        """Test LiveKit participants endpoint"""
        print("\n🔍 Testing LiveKit Participants...")
        if not self.room_id:
            self.log_test("LiveKit Participants", False, "No room ID available")
            return False
            
        success, response = self.run_api_test(
            "LiveKit Participants",
            "GET",
            f"rooms/{self.room_id}/livekit-participants",
            200
        )
        
        if success:
            participants = response.get('participants', [])
            print(f"   LiveKit participants count: {len(participants)}")
            
            # Validate participant structure if any exist
            if participants:
                participant = participants[0]
                required_fields = ['identity', 'name', 'is_muted', 'is_teacher']
                missing_fields = [field for field in required_fields if field not in participant]
                
                if missing_fields:
                    self.log_test("LiveKit Participants Validation", False, f"Missing fields: {missing_fields}")
                    return False
                
                self.log_test("LiveKit Participants Validation", True, "Participant structure valid")
        
        return success

    def setup_socket_client(self):
        """Setup Socket.IO client for testing"""
        try:
            self.sio_client1 = socketio.SimpleClient()
            self.sio_client1.connect(self.socket_url, socketio_path='/api/socket.io')
            print("✅ Socket.IO client connected")
            return True
        except Exception as e:
            print(f"❌ Socket.IO connection failed: {str(e)}")
            return False

    def test_socket_join_room(self):
        """Test Socket.IO join_room event"""
        print("\n🔍 Testing Socket.IO Join Room...")
        if not self.sio_client1 or not self.room_id or not self.user_data:
            self.log_test("Socket Join Room", False, "Prerequisites not met")
            return False

        try:
            # Emit join_room event
            self.sio_client1.emit('join_room', {
                'room_id': self.room_id,
                'user_id': self.user_data['id'],
                'name': self.user_data['name']
            })
            
            # Wait for response
            time.sleep(1)
            
            self.log_test("Socket Join Room", True, "Event emitted successfully")
            return True
        except Exception as e:
            self.log_test("Socket Join Room", False, f"Error: {str(e)}")
            return False

    def test_socket_toggle_mute(self):
        """Test Socket.IO toggle_mute event"""
        print("\n🔍 Testing Socket.IO Toggle Mute...")
        if not self.sio_client1 or not self.room_id or not self.user_data:
            self.log_test("Socket Toggle Mute", False, "Prerequisites not met")
            return False

        try:
            self.sio_client1.emit('toggle_mute', {
                'room_id': self.room_id,
                'user_id': self.user_data['id'],
                'is_muted': True
            })
            
            time.sleep(0.5)
            
            self.log_test("Socket Toggle Mute", True, "Event emitted successfully")
            return True
        except Exception as e:
            self.log_test("Socket Toggle Mute", False, f"Error: {str(e)}")
            return False

    def test_socket_raise_hand(self):
        """Test Socket.IO raise_hand event"""
        print("\n🔍 Testing Socket.IO Raise Hand...")
        if not self.sio_client1 or not self.room_id or not self.user_data:
            self.log_test("Socket Raise Hand", False, "Prerequisites not met")
            return False

        try:
            self.sio_client1.emit('raise_hand', {
                'room_id': self.room_id,
                'user_id': self.user_data['id'],
                'is_hand_raised': True
            })
            
            time.sleep(0.5)
            
            self.log_test("Socket Raise Hand", True, "Event emitted successfully")
            return True
        except Exception as e:
            self.log_test("Socket Raise Hand", False, f"Error: {str(e)}")
            return False

    def test_socket_send_message(self):
        """Test Socket.IO send_message event"""
        print("\n🔍 Testing Socket.IO Send Message...")
        if not self.sio_client1 or not self.room_id or not self.user_data:
            self.log_test("Socket Send Message", False, "Prerequisites not met")
            return False

        try:
            self.sio_client1.emit('send_message', {
                'room_id': self.room_id,
                'user_id': self.user_data['id'],
                'user_name': self.user_data['name'],
                'content': 'Test message from backend test'
            })
            
            time.sleep(0.5)
            
            self.log_test("Socket Send Message", True, "Event emitted successfully")
            return True
        except Exception as e:
            self.log_test("Socket Send Message", False, f"Error: {str(e)}")
            return False

    def cleanup_socket(self):
        """Cleanup Socket.IO connections"""
        try:
            if self.sio_client1 and self.sio_client1.connected:
                self.sio_client1.disconnect()
                print("✅ Socket.IO client disconnected")
        except Exception as e:
            print(f"⚠️ Socket cleanup error: {str(e)}")

    def test_end_room(self):
        """Test room ending (teacher only)"""
        print("\n🔍 Testing End Room...")
        if not self.room_id:
            self.log_test("End Room", False, "No room ID available")
            return False
            
        success, response = self.run_api_test(
            "End Room",
            "DELETE",
            f"rooms/{self.room_id}",
            200
        )
        
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Orbital Classroom Backend Tests")
        print("=" * 50)
        
        # API Tests
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_auth_me,
            self.test_create_room,
            self.test_join_room,
            self.test_get_room,
            self.test_get_participants,
            self.test_get_messages,
        ]
        
        # Run API tests
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
        
        # Socket.IO Tests
        print("\n🔌 Testing Socket.IO Functionality...")
        if self.setup_socket_client():
            socket_tests = [
                self.test_socket_join_room,
                self.test_socket_toggle_mute,
                self.test_socket_raise_hand,
                self.test_socket_send_message,
            ]
            
            for test in socket_tests:
                try:
                    test()
                except Exception as e:
                    print(f"❌ Socket test {test.__name__} failed: {str(e)}")
            
            self.cleanup_socket()
        
        # Cleanup - End room
        if self.room_id:
            self.test_end_room()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = OrbitalClassroomTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())