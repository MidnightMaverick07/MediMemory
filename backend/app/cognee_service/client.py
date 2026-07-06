import os
import json
import logging
import httpx
import asyncio
from app.config import settings

logger = logging.getLogger("cognee_service")

class CogneeCloudClient:
    def __init__(self, api_key: str, base_url: str, tenant_id: str = None):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.tenant_id = tenant_id
        self.headers = {
            "X-Api-Key": self.api_key,
        }
        if self.tenant_id:
            self.headers["X-Tenant-Id"] = self.tenant_id
        
    async def add(self, data_content: str, dataset_name: str, node_set: list[str] = None):
        """Add text data to Cognee using JSON body (not multipart fake file)."""
        url = f"{self.base_url}/api/v1/add"
        json_data = {
            "data": data_content,
            "dataset_name": dataset_name
        }
        if node_set:
            json_data["node_set"] = node_set
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                    response = await client.post(url, headers=self.headers, json=json_data)
                    response.raise_for_status()
                    return response.json()
            except Exception as e:
                if attempt == 2:
                    raise e
                logger.warning(f"Add attempt {attempt+1} failed: {e}. Retrying...")
                await asyncio.sleep(2 * (attempt + 1))

    async def add_file(self, file_path: str, dataset_name: str, filename: str, node_set: list[str] = None):
        """Upload a raw file (PDF/TXT) directly to Cognee for server-side parsing."""
        url = f"{self.base_url}/api/v1/add"
        ext = os.path.splitext(filename)[1].lower().lstrip(".")
        mime = {"pdf": "application/pdf", "txt": "text/plain"}.get(ext, "application/octet-stream")
        
        for attempt in range(3):
            try:
                with open(file_path, "rb") as f:
                    files = {"data": (filename, f, mime)}
                    data = {"datasetName": dataset_name}
                    if node_set:
                        data["node_set"] = json.dumps(node_set)
                    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
                        response = await client.post(url, headers=self.headers, files=files, data=data)
                        response.raise_for_status()
                        return response.json()
            except Exception as e:
                if attempt == 2:
                    raise e
                logger.warning(f"Add file attempt {attempt+1} failed: {e}. Retrying...")
                await asyncio.sleep(2 * (attempt + 1))

    async def cognify(self, dataset_name: str, custom_prompt: str = None, chunk_size: int = None):
        """Trigger cognify to build the knowledge graph, with optional medical prompt."""
        # 1. Trigger cognify
        url = f"{self.base_url}/api/v1/cognify"
        json_data = {
            "datasets": [dataset_name],
            "run_in_background": True
        }
        if custom_prompt:
            json_data["custom_prompt"] = custom_prompt
        if chunk_size:
            json_data["chunk_size"] = chunk_size
            
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                    response = await client.post(url, headers=self.headers, json=json_data)
                    response.raise_for_status()
                    cognify_resp = response.json()
                    break
            except Exception as e:
                if attempt == 2:
                    raise e
                logger.warning(f"Cognify attempt {attempt+1} failed: {e}. Retrying...")
                await asyncio.sleep(2 * (attempt + 1))
            
        # 2. Look up dataset UUID to poll status
        dataset_uuid = await self._get_dataset_uuid(dataset_name)
        if not dataset_uuid:
            logger.warning(f"Could not find dataset UUID for '{dataset_name}' to poll status. Skipping poll.")
            return cognify_resp
            
        # 3. Poll for pipeline completion
        await self._poll_cognify_status(dataset_uuid)
        return cognify_resp

    async def search(self, query_text: str, dataset_name: str, search_type: str = "GRAPH_COMPLETION", top_k: int = 10) -> list:
        """Search Cognee with a valid search type (GRAPH_COMPLETION, CHUNKS, HYBRID_COMPLETION)."""
        url = f"{self.base_url}/api/v1/search"
        json_data = {
            "query": query_text,
            "search_type": search_type,
            "datasets": [dataset_name],
            "top_k": top_k
        }
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                    response = await client.post(url, headers=self.headers, json=json_data)
                    response.raise_for_status()
                    resp_json = response.json()
                    break
            except Exception as e:
                if attempt == 1:
                    raise e
                logger.warning(f"Search attempt {attempt+1} failed: {e}. Retrying...")
                await asyncio.sleep(1.5)
            
        # Extract list of results
        if isinstance(resp_json, list):
            return resp_json
        elif isinstance(resp_json, dict):
            # If backend returns wrapping dict like {"results": [...]}
            return resp_json.get("results", [resp_json])
        return [str(resp_json)]

    async def search_multi(self, query_text: str, dataset_name: str, top_k: int = 10) -> list:
        """Search with GRAPH_COMPLETION + CHUNKS and merge results."""
        all_results = []
        for search_type in ["GRAPH_COMPLETION", "CHUNKS"]:
            try:
                results = await self.search(query_text, dataset_name, search_type=search_type, top_k=top_k)
                all_results.extend(results)
            except Exception as e:
                logger.warning(f"search_multi: {search_type} search failed: {e}. Continuing with other types.")
        return all_results

    async def forget(self, dataset_name: str):
        dataset_uuid = await self._get_dataset_uuid(dataset_name)
        if not dataset_uuid:
            logger.info(f"Dataset '{dataset_name}' not found for deletion.")
            return
            
        url = f"{self.base_url}/api/v1/datasets/{dataset_uuid}/"
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                    response = await client.delete(url, headers=self.headers)
                    if response.status_code == 404:
                        return
                    response.raise_for_status()
                    return response.json()
            except Exception as e:
                if attempt == 2:
                    raise e
                logger.warning(f"Forget attempt {attempt+1} failed: {e}. Retrying...")
                await asyncio.sleep(2 * (attempt + 1))

    async def _get_dataset_uuid(self, dataset_name: str) -> str:
        url = f"{self.base_url}/api/v1/datasets/"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for attempt in range(3):
                try:
                    response = await client.get(url, headers=self.headers)
                    response.raise_for_status()
                    datasets = response.json()
                    for ds in datasets:
                        if ds.get("name") == dataset_name:
                            return ds.get("id")
                    break
                except Exception as e:
                    if attempt == 2:
                        logger.error(f"Failed to fetch dataset UUID for '{dataset_name}': {e}")
                    await asyncio.sleep(1 * (attempt + 1))
        return None

    async def _poll_cognify_status(self, dataset_uuid: str):
        """Poll cognify status: 60 attempts × 5s = 5 minutes max."""
        url = f"{self.base_url}/api/v1/datasets/status/"
        params = {
            "dataset": dataset_uuid
        }
        max_attempts = 60
        poll_interval = 5
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for attempt in range(max_attempts):
                try:
                    response = await client.get(url, headers=self.headers, params=params)
                    response.raise_for_status()
                    status_data = response.json()
                    status = status_data.get(dataset_uuid)
                    if isinstance(status, dict):
                        status = status.get("cognify_pipeline", "completed")
                    
                    logger.info(f"Cognee Cloud status poll {attempt+1}/{max_attempts} for {dataset_uuid}: {status}")
                    
                    if status in ("completed", "DATASET_PROCESSING_COMPLETED"):
                        return
                    elif status in ("failed", "DATASET_PROCESSING_FAILED"):
                        raise ValueError(f"Cognee Cloud cognify pipeline failed for dataset {dataset_uuid}.")
                        
                except Exception as e:
                    logger.warning(f"Error polling status: {e}")
                    if attempt == max_attempts - 1:
                        raise e
                        
                await asyncio.sleep(poll_interval)
            
            raise TimeoutError(f"Cognee Cloud cognify pipeline timed out for dataset {dataset_uuid}.")

class CogneeCloudWrapper:
    def __init__(self):
        self.client = None

    def init_client(self, api_key: str, base_url: str, tenant_id: str = None):
        self.client = CogneeCloudClient(api_key, base_url, tenant_id)

    async def remember(self, data: str, dataset_name: str, node_set: list[str] = None):
        """Add text data to Cognee via JSON body."""
        if not self.client:
            raise RuntimeError("CogneeCloudClient not initialized.")
        return await self.client.add(data, dataset_name, node_set=node_set)

    async def remember_file(self, file_path: str, dataset_name: str, filename: str, node_set: list[str] = None):
        """Upload a raw file (PDF/TXT) directly to Cognee."""
        if not self.client:
            raise RuntimeError("CogneeCloudClient not initialized.")
        return await self.client.add_file(file_path, dataset_name, filename, node_set=node_set)

    async def improve(self, dataset: str, custom_prompt: str = None):
        """Run cognify to build/refine the knowledge graph."""
        if not self.client:
            raise RuntimeError("CogneeCloudClient not initialized.")
        return await self.client.cognify(dataset, custom_prompt=custom_prompt)

    async def recall(self, query_text: str, datasets: list, search_type: str = "GRAPH_COMPLETION"):
        """Search Cognee with a single search type."""
        if not self.client:
            raise RuntimeError("CogneeCloudClient not initialized.")
        dataset_name = datasets[0] if datasets else "default"
        return await self.client.search(query_text, dataset_name, search_type=search_type)

    async def recall_multi(self, query_text: str, datasets: list):
        """Search with GRAPH_COMPLETION + CHUNKS and merge results."""
        if not self.client:
            raise RuntimeError("CogneeCloudClient not initialized.")
        dataset_name = datasets[0] if datasets else "default"
        return await self.client.search_multi(query_text, dataset_name)

    async def forget(self, dataset: str):
        if not self.client:
            raise RuntimeError("CogneeCloudClient not initialized.")
        return await self.client.forget(dataset)

cognee_cloud = CogneeCloudWrapper()

# Keep setup dir creation for uploads path
os.makedirs(settings.upload_dir, exist_ok=True)

async def init_cognee_service():
    api_key = settings.COGNEE_API_KEY
    base_url = settings.COGNEE_BASE_URL
    tenant_id = settings.COGNEE_TENANT_ID
    if not api_key:
        logger.warning("COGNEE_API_KEY is not set in backend configurations.")
    cognee_cloud.init_client(api_key, base_url, tenant_id)
    logger.info("Cognee Cloud Wrapper service initialized successfully.")
