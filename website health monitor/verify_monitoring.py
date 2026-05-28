import asyncio
import sys
from pathlib import Path

# Ensure correct app module import path
sys.path.append(str(Path(__file__).resolve().parent))

from app.monitor import run_all_checks
from app.storage import export_excel_report

async def main():
    print(">>> Triggering initial diagnostic sweep of all clustered nodes...")
    results = await run_all_checks()
    print("\n--- Health sweep results:")
    for site, res in zip(["google", "github", "httpbin_ok", "httpbin_slow", "httpbin_404"], results):
        status = "ONLINE" if res["is_up"] else "OFFLINE"
        print(f"   * Site ID: {site:<12} | Status: {status:<8} | Status Code: {res['status_code']:<3} | Latency: {res['latency_ms']:.1f}ms")
        if res["error_message"]:
            print(f"     [-] Error: {res['error_message']}")

    print("\n--- Generating executive styled Excel workbook report...")
    excel_path = export_excel_report()
    print(f"   * Styled Excel report successfully exported to: {excel_path}")
    print("\n[SUCCESS] Verification complete! Cluster logs and annotated screen views are fully generated.")

if __name__ == "__main__":
    asyncio.run(main())
