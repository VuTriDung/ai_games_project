import json
import math
import random
from pathlib import Path
from typing import Any, Dict, List, Optional


def randn() -> float:
    """Trả về số ngẫu nhiên Gaussian chuẩn."""
    while True:
        u = random.random()
        if u > 0:
            break
    while True:
        v = random.random()
        if v > 0:
            break
    return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)


class FlappyNeuralNet:
    """Mạng nơ-ron nhỏ dùng cho trò chơi Flappy Bird."""

    def __init__(self, weights: Optional[List[float]] = None):
        self.weights = list(weights) if weights is not None else [randn() * 1.5 for _ in range(6)]

    def forward(self, dy: float, dist: float, vel: float, gap_center: float) -> bool:
        score = (
            self.weights[0] * dy
            + self.weights[1] * dist
            + self.weights[2] * vel
            + self.weights[3]
            + self.weights[4] * gap_center
            + self.weights[5] * vel * vel * math.copysign(1.0, vel)
        )
        return score > 0

    def mutate(self, rate: float) -> "FlappyNeuralNet":
        mutated = [
            x + randn() * 0.5 if random.random() < rate else x
            for x in self.weights
        ]
        return FlappyNeuralNet(mutated)

    def clone(self) -> "FlappyNeuralNet":
        return FlappyNeuralNet(self.weights)


def build_default_flappy_payload() -> Dict[str, Any]:
    return {
        "weights": [],
        "generation": 1,
        "best_score": 0,
        "all_time_best": 0,
    }


def load_flappy_model(path: Optional[Path] = None) -> Dict[str, Any]:
    target_path = path or Path(__file__).resolve().parent.parent / "data" / "flappy_model.json"
    if not target_path.exists():
        save_flappy_model(build_default_flappy_payload(), target_path)
        return build_default_flappy_payload()

    try:
        with target_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        save_flappy_model(build_default_flappy_payload(), target_path)
        return build_default_flappy_payload()


def save_flappy_model(payload: Dict[str, Any], path: Optional[Path] = None) -> Dict[str, Any]:
    target_path = path or Path(__file__).resolve().parent.parent / "data" / "flappy_model.json"
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with target_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
    return {"saved": True, "path": str(target_path)}
