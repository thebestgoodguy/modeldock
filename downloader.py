"""Developer / Creator: Sadri ERCAN."""

import argparse
import os
import sys
import traceback

os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "0"
os.environ["TQDM_POSITION"] = "-1"

from concurrent.futures import ThreadPoolExecutor, as_completed
from huggingface_hub import hf_hub_download, snapshot_download


def folder_name_for_repo(repo_id, repo_type):
    clean_repo = repo_id.replace("/", "--").replace("\\", "--")
    return clean_repo if repo_type == "model" else f"{repo_type}--{clean_repo}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--files", nargs="*")
    parser.add_argument("--path", required=True)
    parser.add_argument("--token")
    parser.add_argument("--mirror", action="store_true")
    parser.add_argument("--repo-type", choices=["model", "dataset", "space"], default="model")
    parser.add_argument("--max-workers", type=int, default=8)
    parser.add_argument("--speed-limit-kbps", type=int, default=0)
    args = parser.parse_args()

    os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "0"

    if args.mirror:
        os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

    token = args.token if args.token else None
    max_workers = max(1, min(args.max_workers or 8, 32))

    if args.speed_limit_kbps > 0:
        max_workers = 1
        print(
            f"INFO: Soft speed limit requested: {args.speed_limit_kbps} KB/s. "
            "Using a single worker to reduce bursts.",
            flush=True,
        )

    print(f"INFO: Starting download for {args.repo} ({args.repo_type})", flush=True)

    try:
        repo_clean = folder_name_for_repo(args.repo, args.repo_type)
        local_dir = os.path.join(args.path, repo_clean)
        os.makedirs(local_dir, exist_ok=True)

        if args.files and len(args.files) > 0:
            print(f"INFO: Downloading {len(args.files)} selected file(s)...", flush=True)
            print(f"INFO: Worker count: {max_workers}", flush=True)

            def download_file(file_path):
                print(f"INFO: Downloading {file_path}...", flush=True)
                hf_hub_download(
                    repo_id=args.repo,
                    repo_type=args.repo_type,
                    filename=file_path,
                    local_dir=local_dir,
                    token=token,
                )
                return file_path

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [executor.submit(download_file, file_path) for file_path in args.files]
                for index, future in enumerate(as_completed(futures), start=1):
                    file_path = future.result()
                    percent = int((index / len(futures)) * 100)
                    print(f"INFO: Finished {file_path} ({percent}%)", flush=True)
        else:
            print("INFO: Downloading full repository...", flush=True)
            print(f"INFO: Worker count: {max_workers}", flush=True)
            snapshot_download(
                repo_id=args.repo,
                repo_type=args.repo_type,
                local_dir=local_dir,
                token=token,
                max_workers=max_workers,
            )

        print("\nSUCCESS", flush=True)
        sys.exit(0)

    except Exception as e:
        print(f"\nERROR: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
