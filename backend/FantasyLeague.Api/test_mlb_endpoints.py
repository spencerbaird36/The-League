#!/usr/bin/env python3
"""
Test script to validate all MLB Player API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:5000/api/mlbplayers"

def test_all_endpoints():
    print("⚾ MLB Player API Endpoint Tests")
    print("=" * 50)
    
    # Test 1: Get stats
    print("\n1. Testing /stats endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/stats")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Stats: {data['totalPlayers']} players, {data['totalTeams']} teams")
            print(f"   Positions: {', '.join(data['positions'])}")
        else:
            print(f"❌ Stats failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Stats error: {e}")
    
    # Test 2: Sync players
    print("\n2. Testing /sync endpoint...")
    try:
        response = requests.post(f"{BASE_URL}/sync", timeout=30)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sync successful!")
            print(f"   Added: {data.get('playersAdded', 0)}")
            print(f"   Updated: {data.get('playersUpdated', 0)}")
            print(f"   Removed: {data.get('playersRemoved', 0)}")
            print(f"   Total: {data.get('totalValidPlayers', 0)}")
        else:
            print(f"❌ Sync failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Sync error: {e}")
        return
    
    # Test 3: Get players with pagination
    print("\n3. Testing /players endpoint...")
    try:
        response = requests.get(f"{BASE_URL}?pageSize=5&page=1")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Players: {len(data['players'])} returned")
            for player in data['players'][:3]:
                print(f"   {player['fullName']} - {player['position']} ({player['team']}, Age {player['age']})")
        else:
            print(f"❌ Players failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Players error: {e}")
    
    # Test 4: Get C players
    print("\n4. Testing position filter (C)...")
    try:
        response = requests.get(f"{BASE_URL}?position=C&pageSize=3")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Catchers: {len(data['players'])} returned")
            for player in data['players']:
                print(f"   {player['fullName']} - {player['team']} (Age {player['age']})")
        else:
            print(f"❌ C filter failed: {response.status_code}")
    except Exception as e:
        print(f"❌ C filter error: {e}")
    
    # Test 5: Get teams
    print("\n5. Testing /teams endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/teams")
        if response.status_code == 200:
            teams = response.json()
            print(f"✅ Teams: {len(teams)} teams available")
            print(f"   Sample: {', '.join(teams[:5])}")
        else:
            print(f"❌ Teams failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Teams error: {e}")
    
    # Test 6: Get positions
    print("\n6. Testing /positions endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/positions")
        if response.status_code == 200:
            positions = response.json()
            print(f"✅ Positions: {', '.join(positions)}")
        else:
            print(f"❌ Positions failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Positions error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ MLB Player API testing complete!")

if __name__ == "__main__":
    test_all_endpoints()