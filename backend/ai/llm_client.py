"""Thin LLM client wrapper with a deterministic mock fallback.

Mock mode (no API key configured) fully demonstrates the workflow without
requiring network access or API credits.
"""
import os
import json


class LLMClient:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "mock").lower()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("MODEL", "claude-sonnet-5")
        self.mock_mode = not self.api_key or self.provider == "mock"
        self._client = None
        if not self.mock_mode and self.provider == "anthropic":
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.api_key)
            except Exception:
                self.mock_mode = True

    def complete_json(self, system: str, user: str, max_tokens: int = 800) -> str:
        """Returns raw text expected to contain JSON. Caller validates via Pydantic."""
        if self.mock_mode:
            raise RuntimeError("LLM client in mock mode; caller must use a mock generator instead")
        if self.provider == "anthropic" and self._client:
            resp = self._client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return resp.content[0].text
        raise RuntimeError(f"Unsupported LLM provider: {self.provider}")


llm_client = LLMClient()
