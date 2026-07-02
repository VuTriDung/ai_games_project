#!/usr/bin/env python3
"""Self-play generator for Connect4 using server algorithms.

Creates JSONL records at `data/connect4_selfplay.jsonl` by default.
Runs AI vs AI games calling the internal `minimax` and `mcts` implementations
from `server.py` to avoid HTTP overhead.

Usage:
  python tools/selfplay_connect4.py --games 1000 --out data/connect4_selfplay.jsonl --pair minimax_mcts

Pairs supported: minimax_mcts, minimax_minimax, mcts_mcts
"""
import argparse
import json
import time
from pathlib import Path
import random

from server import apply_move, check_winner, minimax, mcts, valid_moves


def play_game(pair: str, depth: int, iterations: int, seed: int = None):
    if seed is not None:
        random.seed(seed)

    board = [[0] * 7 for _ in range(6)]
    current = 1
    moves = []
    while True:
        moves_avail = valid_moves(board)
        if not moves_avail:
            winner = 0
            break

        if pair == 'minimax_mcts':
            if current == 1:
                _, col = minimax(board, depth=depth, alpha=-10**9, beta=10**9, maximizing=True, player=1)
            else:
                col = mcts(board, 2, iterations=iterations)
        elif pair == 'minimax_minimax':
            _, col = minimax(board, depth=depth, alpha=-10**9, beta=10**9, maximizing=True, player=current)
        elif pair == 'mcts_mcts':
            col = mcts(board, current, iterations=iterations)
        else:
            raise ValueError('Unknown pair')

        if col is None:
            col = random.choice(moves_avail)

        # apply
        board = apply_move(board, int(col), current)
        moves.append(int(col))

        winner = check_winner(board)
        if winner is not None:
            break

        current = 1 if current == 2 else 2

    return {
        'moves': moves,
        'winner': winner,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--games', type=int, default=500, help='Number of self-play games to generate')
    p.add_argument('--out', type=str, default='data/connect4_selfplay.jsonl')
    p.add_argument('--pair', type=str, default='minimax_mcts', choices=['minimax_mcts','minimax_minimax','mcts_mcts'])
    p.add_argument('--depth', type=int, default=6, help='Minimax search depth')
    p.add_argument('--iters', type=int, default=400, help='MCTS iterations')
    p.add_argument('--seed', type=int, default=None)
    args = p.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    total = args.games
    start = time.time()
    with out_path.open('a', encoding='utf-8') as f:
        for i in range(total):
            rec = play_game(args.pair, depth=args.depth, iterations=args.iters, seed=(None if args.seed is None else args.seed + i))
            payload = {
                'moves': rec['moves'],
                'winner': rec['winner'],
                'ai_pair': args.pair,
                'meta': {'depth': args.depth, 'iterations': args.iters},
                'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            }
            f.write(json.dumps(payload, ensure_ascii=False) + '\n')

            if (i + 1) % 50 == 0 or i == total - 1:
                elapsed = time.time() - start
                print(f'[{i+1}/{total}] wrote game, elapsed {elapsed:.1f}s')

    print('Done. Wrote', total, 'games to', out_path)


if __name__ == '__main__':
    main()
