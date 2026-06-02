#!/usr/bin/env python3
"""
test_endpoints.py - Test simulation and fallacy classifier endpoints

Usage:
    python test_endpoints.py [--base-url https://your-tunnel.trycloudflare.com]
"""

import json
import urllib.request
import urllib.error
import argparse
import time


def test_endpoint(url: str, name: str, expected_status: int = 200) -> bool:
    """Test a single endpoint"""
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            print(f"  ✅ {name}: {response.status} - OK")
            return True, data
    except urllib.error.HTTPError as e:
        print(f"  ❌ {name}: HTTP {e.code}")
        return False, None
    except Exception as e:
        print(f"  ❌ {name}: {str(e)[:50]}")
        return False, None


def test_simulation_api(base_url: str) -> dict:
    """Test simulation ABM API"""
    print("\n=== SIMULATION API (port 5001) ===")
    results = {}

    tests = [
        (f"{base_url}/api/health", "Health Check"),
        (f"{base_url}/api/simulation/state", "Simulation State"),
        (f"{base_url}/api/simulation/metrics", "Simulation Metrics"),
        (f"{base_url}/api/simulation/agents", "Agent List"),
        (f"{base_url}/api/simulation/config", "Simulation Config"),
    ]

    for url, name in tests:
        ok, data = test_endpoint(url, name)
        results[name] = ok

    return results


def test_fallacy_classifier(base_url: str) -> dict:
    """Test RoBERTa fallacy classifier API"""
    print("\n=== FALLACY CLASSIFIER (port 5002) ===")
    results = {}

    # Health check
    ok, data = test_endpoint(f"{base_url}/health", "Health Check")
    results["Health Check"] = ok
    if data and data.get("model"):
        print(f"     Model: {data['model']} on {data.get('device', 'unknown')}")

    # Labels
    ok, data = test_endpoint(f"{base_url}/labels", "Labels")
    results["Labels"] = ok
    if data and data.get("labels"):
        print(f"     {len(data['labels'])} supported fallacies")

    # Classify test - False Causality
    print("\n  Testing classify-single:")
    test_cases = [
        {
            "text": "The rooster crows before sunrise, therefore the rooster causes the sun to rise.",
            "expected": "false causality",
        },
        {
            "text": "You're stupid because you always make mistakes.",
            "expected": "ad hominem",
        },
        {
            "text": "Either you support me completely or you're against me.",
            "expected": "false dilemma",
        },
    ]

    for i, case in enumerate(test_cases):
        try:
            req = urllib.request.Request(
                f"{base_url}/classify-single",
                data=json.dumps({"text": case["text"]}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
                fallacies = data.get("fallacies", [])
                if fallacies:
                    top = fallacies[0]
                    match = case["expected"].lower() in top["label"].lower()
                    status = "✅" if match else "⚠️"
                    print(f"    {status} Test {i + 1}: '{case['text'][:40]}...'")
                    print(f"       Detected: {top['label']} ({top['confidence']:.2f})")
                    results[f"Classify-{i + 1}"] = True
                else:
                    print(f"    ⚠️ Test {i + 1}: No fallacies detected")
                    results[f"Classify-{i + 1}"] = False
        except Exception as e:
            print(f"    ❌ Test {i + 1}: {str(e)[:50]}")
            results[f"Classify-{i + 1}"] = False

    return results


def test_fallacy_dataset(base_url: str) -> dict:
    """Test fallacy dataset endpoint"""
    print("\n=== FALLACY DATASET ===")
    results = {}

    ok, data = test_endpoint(f"{base_url}/fallacy-data", "Dataset")
    results["Dataset"] = ok
    if data:
        print(f"     Total entries: {data.get('total', 'unknown')}")
        print(f"     Sources: {', '.join(data.get('sources', []))}")
        by_type = data.get("by_type", {})
        if by_type:
            top_types = sorted(by_type.items(), key=lambda x: -len(x[1]))[:5]
            print(f"     Top 5 types: {', '.join(f'{t}({c})' for t, c in top_types)}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Test API endpoints")
    parser.add_argument(
        "--base-url", default="http://localhost:5002", help="Base URL for classifier"
    )
    parser.add_argument(
        "--sim-url", default="http://localhost:5001", help="Base URL for simulation"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("SOVEREIGN MIRROR - API ENDPOINT TEST")
    print("=" * 60)

    all_results = {}

    # Test classifier on port 5002
    classifier_results = test_fallacy_classifier(args.base_url)
    all_results.update(classifier_results)

    # Test fallacy dataset
    dataset_results = test_fallacy_dataset(args.base_url)
    all_results.update(dataset_results)

    # Test simulation on port 5001
    sim_results = test_simulation_api(args.sim_url)
    all_results.update(sim_results)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    passed = sum(1 for v in all_results.values() if v)
    total = len(all_results)

    for name, ok in all_results.items():
        status = "✅" if ok else "❌"
        print(f"  {status} {name}")

    print(f"\nTotal: {passed}/{total} passed")

    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")


if __name__ == "__main__":
    main()
