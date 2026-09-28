// Sample study material used by Demo Mode. Written as a student's course notes.

export const DEMO_SUBJECT = "Data Structures";

export interface DemoMaterial {
  topic: string;
  title: string;
  fileName: string;
  daysAgo: number;
  content: string;
}

export const DEMO_MATERIALS: DemoMaterial[] = [
  {
    topic: "Arrays",
    title: "Arrays — Lecture Notes",
    fileName: "arrays-lecture-notes.txt",
    daysAgo: 12,
    content: `ARRAYS — LECTURE NOTES (Data Structures, Week 2)

1. What is an array?
An array stores a fixed number of elements of the same type in one contiguous block of memory. Each element is identified by an index. In most languages (C, Java, Python lists, JavaScript) indexing starts at 0, so an array of length n has valid indices 0 to n-1.

2. Why arrays are fast to read
Because elements sit next to each other in memory, the address of element i can be computed directly:
    address(i) = base_address + i * element_size
This is why reading or writing arr[i] takes O(1) time — "random access". No searching is needed.

3. Common operations and their cost
- Access by index: O(1)
- Update by index: O(1)
- Search for a value (unsorted): O(n) — you may have to look at every element (linear search)
- Search in a sorted array: O(log n) using binary search
- Insert or delete at the end (dynamic array): O(1) amortized
- Insert or delete at the beginning or middle: O(n) — every later element must shift one position

4. Static vs dynamic arrays
A static array has a fixed size chosen when it is created. A dynamic array (Python list, Java ArrayList, C++ vector) grows automatically. When it runs out of room it allocates a bigger block (usually double the size) and copies everything over. Copying is O(n), but it happens rarely, so appending is O(1) on average ("amortized").

5. Two-dimensional arrays
A 2D array (matrix) is stored row by row in row-major order. Element [r][c] in a matrix with C columns is at position r * C + c.

6. Typical mistakes
- Off-by-one errors: looping with i <= n instead of i < n reads past the end.
- Assuming insertion in the middle is cheap. It isn't — elements must shift.
- Confusing length (number of elements) with the last index (length - 1).

7. Example: reversing an array in place
    def reverse(arr):
        left, right = 0, len(arr) - 1
        while left < right:
            arr[left], arr[right] = arr[right], arr[left]
            left += 1
            right -= 1
This "two pointers" technique uses O(1) extra space and O(n) time.

8. When to use an array
Use an array when you need fast access by position and the collection mostly grows at the end. If you need frequent insertions and deletions in the middle, consider a linked list.`,
  },
  {
    topic: "Linked Lists",
    title: "Linked Lists — Lecture Notes",
    fileName: "linked-lists-notes.txt",
    daysAgo: 9,
    content: `LINKED LISTS — LECTURE NOTES (Data Structures, Week 3)

1. The idea
A linked list is a chain of nodes. Each node stores a value and a reference (pointer) to the next node. The list itself only needs to remember the first node, called the head. The last node points to null (None).

    class Node:
        def __init__(self, value):
            self.value = value
            self.next = None

2. Nodes are not contiguous
Unlike an array, nodes can live anywhere in memory. That means there is no formula to jump to the i-th element: to reach position i you must follow i "next" pointers from the head. Access by index is therefore O(n).

3. Operations and cost (singly linked list)
- Access i-th element: O(n)
- Insert at head: O(1) — create node, point it to the old head, update head
- Delete at head: O(1)
- Insert after a node you already have a reference to: O(1)
- Insert at tail: O(n), or O(1) if you keep a tail pointer
- Search for a value: O(n)

4. Inserting at the head
    def push_front(head, value):
        node = Node(value)
        node.next = head
        return node   # the new head
Order matters: link the new node to the old head BEFORE moving head, or the rest of the list is lost.

5. Deleting a node
To delete the node after "prev": prev.next = prev.next.next. The skipped node is no longer reachable and gets garbage-collected.

6. Doubly linked lists
Each node also stores a "prev" pointer. This allows moving backwards and deleting a node in O(1) when you have a reference to it, at the cost of extra memory per node.

7. Traversal pattern
    current = head
    while current is not None:
        print(current.value)
        current = current.next
Forgetting "current = current.next" causes an infinite loop.

8. Arrays vs linked lists
- Need fast access by index? Array.
- Need many insertions/deletions at the front or in the middle (when you already hold the position)? Linked list.
- Linked lists use extra memory for pointers and have poorer cache locality.

9. Classic interview problems
- Reverse a linked list (iteratively with prev/current/next pointers)
- Detect a cycle (Floyd's slow and fast pointers)
- Find the middle node (slow pointer moves 1 step, fast pointer moves 2)`,
  },
  {
    topic: "Recursion",
    title: "Recursion — Study Guide",
    fileName: "recursion-study-guide.txt",
    daysAgo: 6,
    content: `RECURSION — STUDY GUIDE (Data Structures, Week 4)

1. Definition
A recursive function solves a problem by calling itself on a smaller version of the same problem. Every recursive function needs two parts:
- Base case: the smallest version of the problem, answered directly without recursion.
- Recursive case: break the problem into a smaller piece, call the function on it, and combine the result.

2. Example: factorial
    def factorial(n):
        if n == 0:            # base case
            return 1
        return n * factorial(n - 1)   # recursive case
factorial(3) = 3 * factorial(2) = 3 * 2 * factorial(1) = 3 * 2 * 1 * factorial(0) = 6

3. The call stack
Each call gets its own stack frame holding its parameters and local variables. Calls pile up until the base case is reached, then return one by one ("unwinding"). factorial(3) uses 4 frames at its deepest point.

4. What goes wrong
- Missing base case, or a base case that is never reached (e.g. calling factorial(n) instead of factorial(n - 1)) → infinite recursion → stack overflow (RecursionError in Python).
- Forgetting to return the recursive result: writing factorial(n - 1) without "return" gives None.

5. Tracing technique
Write each call on its own line, indenting as you go deeper. Then fill in return values from the bottom up. This is the most reliable way to predict output on an exam.

6. Recursion vs iteration
Anything recursive can be written with a loop (plus, sometimes, an explicit stack). Recursion is clearer for problems that are naturally self-similar: trees, divide-and-conquer (merge sort, binary search), and backtracking. Iteration avoids stack overhead.

7. Example: sum of a list
    def total(nums):
        if not nums:
            return 0
        return nums[0] + total(nums[1:])

8. Example: Fibonacci and repeated work
    def fib(n):
        if n < 2:
            return n
        return fib(n - 1) + fib(n - 2)
This is correct but slow — O(2^n) — because it recomputes the same values many times. Memoization (caching results) brings it down to O(n).

9. Checklist for writing a recursive function
1) What is the smallest input? That's the base case.
2) Assume the function already works for a smaller input ("leap of faith").
3) How do you build the answer for n from the answer for the smaller input?
4) Make sure every call moves toward the base case.`,
  },
  {
    topic: "Binary Trees",
    title: "Binary Trees — Lecture Notes",
    fileName: "binary-trees-notes.txt",
    daysAgo: 3,
    content: `BINARY TREES — LECTURE NOTES (Data Structures, Week 5)

1. Vocabulary
A binary tree is made of nodes. Each node has a value and at most two children: left and right.
- Root: the top node (no parent)
- Leaf: a node with no children
- Height: the number of edges on the longest path from the root down to a leaf
- Depth of a node: number of edges from the root to that node
- Subtree: a node together with all of its descendants

    class TreeNode:
        def __init__(self, value):
            self.value = value
            self.left = None
            self.right = None

2. Trees are recursive
Every child is itself the root of a smaller binary tree. That is why most tree algorithms are recursive: solve for the left subtree, solve for the right subtree, combine.

    def count_nodes(node):
        if node is None:
            return 0
        return 1 + count_nodes(node.left) + count_nodes(node.right)

3. Traversals (depth-first)
- Preorder: node, left, right
- Inorder: left, node, right
- Postorder: left, right, node
For the tree with root 2, left child 1, right child 3:
- Preorder: 2 1 3
- Inorder: 1 2 3
- Postorder: 1 3 2
Level-order (breadth-first) visits nodes level by level using a queue.

4. Binary search trees (BST)
A BST adds an ordering rule: every value in a node's left subtree is smaller than the node, and every value in its right subtree is larger. Consequences:
- Inorder traversal of a BST gives the values in sorted order.
- Search, insert and delete take O(h) time, where h is the height.
- Balanced tree: h ≈ log2(n), so operations are O(log n).
- Degenerate tree (e.g. inserting 1, 2, 3, 4, 5 in order): it becomes a "linked list", h = n - 1, operations are O(n).

5. Searching a BST
    def contains(node, target):
        if node is None:
            return False
        if target == node.value:
            return True
        if target < node.value:
            return contains(node.left, target)
        return contains(node.right, target)

6. Common mistakes
- Checking only a node's direct children when validating a BST. The rule applies to the whole subtree.
- Confusing height and depth.
- Forgetting the None base case in recursive tree functions.

7. Height of a tree
    def height(node):
        if node is None:
            return -1        # so that a single leaf has height 0
        return 1 + max(height(node.left), height(node.right))`,
  },
];
