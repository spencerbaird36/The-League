#!/usr/bin/env python3
"""
Simple test script to validate NFL Player API endpoints
"""
import requests
import json

API_BASE = "http://localhost:5000/api/nflplayers"

def test_endpoints():
    print("🏈 Testing NFL Player Database API")
    print("=" * 50)
    
    try:
        # Test 1: Sync players from API
        print("\n1. Testing player sync...")
        sync_response = requests.post(f"{API_BASE}/sync", timeout=30)
        if sync_response.status_code == 200:
            sync_data = sync_response.json()
            print(f"✅ Sync successful!")
            print(f"   Added: {sync_data.get('playersAdded', 0)}")
            print(f"   Updated: {sync_data.get('playersUpdated', 0)}")
            print(f"   Removed: {sync_data.get('playersRemoved', 0)}")
            print(f"   Total: {sync_data.get('totalValidPlayers', 0)}")
        else:
            print(f"❌ Sync failed: {sync_response.status_code}")
            return
    except Exception as e:
        print(f"❌ Sync error: {e}")
        return
    
    try:
        # Test 2: Get stats
        print("\n2. Testing stats endpoint...")
        stats_response = requests.get(f"{API_BASE}/stats")
        if stats_response.status_code == 200:
            stats_data = stats_response.json()
            print(f"✅ Stats retrieved:")
            print(f"   Total Players: {stats_data.get('totalPlayers', 0)}")
            print(f"   Total Teams: {stats_data.get('totalTeams', 0)}")
            print(f"   Positions: {', '.join(stats_data.get('positions', []))}")
        else:
            print(f"❌ Stats failed: {stats_response.status_code}")
    except Exception as e:
        print(f"❌ Stats error: {e}")
    
    try:
        # Test 3: Get players with pagination
        print("\n3. Testing player list (first 5)...")
        players_response = requests.get(f"{API_BASE}?pageSize=5")
        if players_response.status_code == 200:
            players_data = players_response.json()
            print(f"✅ Players retrieved:")
            for player in players_data.get('players', [])[:3]:
                print(f"   {player.get('fullName')} ({player.get('fantasyPosition')}, {player.get('team')})")
            pagination = players_data.get('pagination', {})
            print(f"   Total: {pagination.get('totalCount', 0)} players")
        else:
            print(f"❌ Player list failed: {players_response.status_code}")
    except Exception as e:
        print(f"❌ Player list error: {e}")
    
    try:
        # Test 4: Get QB players
        print("\n4. Testing position filter (QB)...")
        qb_response = requests.get(f"{API_BASE}/position/QB?pageSize=3")
        if qb_response.status_code == 200:
            qb_data = qb_response.json()
            print(f"✅ QBs retrieved:")
            for player in qb_data.get('players', []):
                print(f"   {player.get('fullName')} ({player.get('team')}, Age {player.get('age')})")
        else:
            print(f"❌ QB filter failed: {qb_response.status_code}")
    except Exception as e:
        print(f"❌ QB filter error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ NFL Player Database API testing complete!")

if __name__ == "__main__":
    test_endpoints()