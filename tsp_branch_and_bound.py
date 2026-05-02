import matplotlib.pyplot as plt
import random
import math

NUM_NODES = 5
LABELS = ['A', 'B', 'C', 'D', 'E']

# Global variables to track state
best_cost_global = float('inf')
best_path_global = None
explored_paths = []
pruned_paths = []
total_explored = 0
total_pruned = 0

def dist(p1, p2):
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

def get_distance_matrix(points):
    n = len(points)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i][j] = dist(points[i], points[j])
    return matrix

def get_path_string(path):
    return " → ".join(LABELS[i] for i in path)

def tsp_branch_and_bound(curr_node, current_path, current_cost, visited, distance_matrix):
    global best_cost_global, best_path_global, total_explored, total_pruned
    
    # 1. Pruning Condition: if current cost >= min cost -> stop exploring
    if current_cost >= best_cost_global:
        print(f"Pruned route: {get_path_string(current_path)} ❌ (Cost: {current_cost:.2f} >= Best: {best_cost_global:.2f})")
        pruned_paths.append(list(current_path))
        total_pruned += 1
        return

    n = len(distance_matrix)
    
    # 2. Base Case: all nodes visited
    if len(current_path) == n:
        # Return to starting node to complete the cycle
        total_cost = current_cost + distance_matrix[curr_node][current_path[0]]
        path_with_return = current_path + [current_path[0]]
        
        print(f"Explored complete route: {get_path_string(path_with_return)} | Cost: {total_cost:.2f}")
        explored_paths.append(list(path_with_return))
        total_explored += 1
        
        # Update best route if we found a shorter one
        if total_cost < best_cost_global:
            best_cost_global = total_cost
            best_path_global = list(path_with_return)
            print(f"  ⭐ New best route found! Cost: {best_cost_global:.2f}")
        return

    # 3. Recursive Step: explore unvisited child nodes
    for next_node in range(n):
        if not visited[next_node]:
            visited[next_node] = True
            current_path.append(next_node)
            
            # Print current path being explored
            print(f"Exploring: {get_path_string(current_path)} | Current Cost: {current_cost + distance_matrix[curr_node][next_node]:.2f}")
            
            tsp_branch_and_bound(
                next_node, 
                current_path, 
                current_cost + distance_matrix[curr_node][next_node], 
                visited, 
                distance_matrix
            )
            
            # Backtrack
            current_path.pop()
            visited[next_node] = False

def plot_routes(points):
    plt.figure(figsize=(10, 6))
    
    x = [p[0] for p in points]
    y = [p[1] for p in points]
    
    # 1. Plot Pruned Paths (Red Dashed)
    for path in pruned_paths:
        px = [points[n][0] for n in path]
        py = [points[n][1] for n in path]
        plt.plot(px, py, color='red', linestyle='dashed', alpha=0.4, linewidth=1.5)

    # 2. Plot Explored Complete Paths (Green)
    for path in explored_paths:
        px = [points[n][0] for n in path]
        py = [points[n][1] for n in path]
        plt.plot(px, py, color='green', alpha=0.3, linewidth=2)

    # 3. Plot Best Path (Blue)
    if best_path_global:
        bx = [points[n][0] for n in best_path_global]
        by = [points[n][1] for n in best_path_global]
        plt.plot(bx, by, color='blue', linewidth=3, alpha=0.8, marker='o')

    # Plot the points (Houses)
    plt.scatter(x, y, color='black', zorder=5, s=100)
    for i, p in enumerate(points):
        plt.text(p[0] + 1.5, p[1] + 1.5, LABELS[i], fontsize=14, fontweight='bold')

    plt.title("Smart Delivery Route Planner - Branch & Bound", fontsize=14, fontweight='bold')
    plt.xlabel("X Coordinate")
    plt.ylabel("Y Coordinate")
    
    # Custom Legend
    import matplotlib.lines as mlines
    best_line = mlines.Line2D([], [], color='blue', linewidth=3, label='Best Route')
    exp_line = mlines.Line2D([], [], color='green', alpha=0.5, linewidth=2, label='Explored Complete Routes')
    prune_line = mlines.Line2D([], [], color='red', linestyle='dashed', alpha=0.5, linewidth=1.5, label='Pruned Branches')
    plt.legend(handles=[best_line, exp_line, prune_line], loc='upper right')
    
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.show()

def main():
    print("=== Smart Delivery Route Planner ===\n")
    
    # 1. Input Generation
    # Restrict generation to a visually decent grid to avoid clutter
    points = [(random.randint(10, 90), random.randint(10, 90)) for _ in range(NUM_NODES)]
    print(f"Generated {NUM_NODES} random delivery locations:")
    for i, p in enumerate(points):
        print(f"  {LABELS[i]} : {p}")
        
    dist_matrix = get_distance_matrix(points)
    
    print("\n--- Executing Branch & Bound Algorithm ---\n")
    
    visited = [False] * NUM_NODES
    visited[0] = True
    
    # Start solving from Node A (index 0)
    tsp_branch_and_bound(0, [0], 0.0, visited, dist_matrix)
    
    print("\n" + "="*40)
    print("FINAL OUTPUT")
    print("="*40)
    if best_path_global:
        print(f"🏆 Best route:       {get_path_string(best_path_global)}")
        print(f"📏 Minimum distance: {best_cost_global:.2f}")
    print(f"🔍 Total routes explored fully: {total_explored}")
    print(f"✂️  Total routes pruned/skipped: {total_pruned}")
    print("="*40)
    print("\n👉 Branch & Bound skips bad routes early, reducing unnecessary computation.")
    
    # 2. Visualization
    plot_routes(points)

if __name__ == "__main__":
    main()
