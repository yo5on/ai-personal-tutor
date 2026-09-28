import type { QuizQuestion } from "@/types";

// Pre-written questions for Demo Mode: used for the sample quiz history, and as a
// fallback if Gemini is not configured or unavailable during a presentation.
export const DEMO_QUESTION_BANK: Record<string, QuizQuestion[]> = {
  Arrays: [
    {
      question: "Why does reading arr[i] take O(1) time in an array?",
      options: [
        "The element's address is computed directly from the base address and the index",
        "The array is always kept sorted",
        "The computer searches all elements in parallel",
        "Arrays cache the most recently used element",
      ],
      answerIndex: 0,
      explanation:
        "Elements are contiguous, so address = base + i × size. No searching is needed. Sorting has nothing to do with access by index.",
      concept: "Random access",
    },
    {
      question: "What is the time complexity of inserting an element at the beginning of an array of n elements?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      answerIndex: 2,
      explanation:
        "Every existing element must shift one position to the right to make room, which is O(n). O(1) is only true for appending to the end of a dynamic array.",
      concept: "Insertion cost",
    },
    {
      question: "An array has length 8. What is the index of its last element?",
      options: ["8", "7", "9", "It depends on the element type"],
      answerIndex: 1,
      explanation: "With 0-based indexing, valid indices run from 0 to length − 1, so the last one is 7. Using 8 is a classic off-by-one error.",
      concept: "Zero-based indexing",
    },
    {
      question: "Why is appending to a dynamic array (e.g. a Python list) O(1) amortized?",
      options: [
        "It never needs to copy elements",
        "Resizing doubles the capacity, so expensive copies happen rarely",
        "New elements are stored in a separate linked list",
        "The operating system pre-allocates unlimited memory",
      ],
      answerIndex: 1,
      explanation:
        "A resize copies everything (O(n)), but because capacity doubles, it happens so rarely that the average cost per append is constant.",
      concept: "Dynamic arrays",
    },
    {
      question: "In a row-major 2D array with 5 columns, at which flat position is element [2][3]?",
      options: ["10", "13", "15", "23"],
      answerIndex: 1,
      explanation: "Position = row × columns + column = 2 × 5 + 3 = 13.",
      concept: "2D arrays",
    },
    {
      question: "Which search runs in O(log n) on an array?",
      options: [
        "Linear search on an unsorted array",
        "Binary search on a sorted array",
        "Binary search on an unsorted array",
        "Any search, because arrays have random access",
      ],
      answerIndex: 1,
      explanation:
        "Binary search halves the range each step but requires the array to be sorted. Random access alone doesn't help if you don't know where the value is.",
      concept: "Binary search",
    },
  ],
  "Linked Lists": [
    {
      question: "What is the time complexity of accessing the i-th element of a singly linked list?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answerIndex: 2,
      explanation:
        "Nodes aren't contiguous, so you must follow next pointers from the head one by one. There's no address formula like in arrays.",
      concept: "Sequential access",
    },
    {
      question: "When inserting a new node at the head, what must happen first?",
      options: [
        "Set head to the new node",
        "Point the new node's next to the current head",
        "Traverse to the end of the list",
        "Delete the old head",
      ],
      answerIndex: 1,
      explanation:
        "Link the new node to the old head first. If you move head first, you lose your only reference to the rest of the list.",
      concept: "Insert at head",
    },
    {
      question: "How do you delete the node that comes right after node `prev`?",
      options: [
        "prev = prev.next",
        "prev.next = None",
        "prev.next = prev.next.next",
        "prev.next.next = prev",
      ],
      answerIndex: 2,
      explanation:
        "Skipping over the node removes it from the chain. Setting prev.next = None would cut off the entire rest of the list.",
      concept: "Deleting a node",
    },
    {
      question: "What does a doubly linked list add compared with a singly linked list?",
      options: [
        "A pointer to the previous node in each node",
        "Two values per node",
        "O(1) access by index",
        "Automatic sorting",
      ],
      answerIndex: 0,
      explanation: "Each node also stores prev, which allows backward traversal and O(1) deletion given a node — at the cost of extra memory.",
      concept: "Doubly linked lists",
    },
    {
      question: "What technique detects a cycle in a linked list using O(1) extra space?",
      options: [
        "Store every visited node in a hash set",
        "Sort the list first",
        "Slow and fast pointers (Floyd's algorithm)",
        "Reverse the list twice",
      ],
      answerIndex: 2,
      explanation:
        "If there is a cycle, the fast pointer (2 steps) eventually meets the slow pointer (1 step). A hash set also works but uses O(n) space.",
      concept: "Cycle detection",
    },
    {
      question: "Which task is a linked list better suited for than an array?",
      options: [
        "Reading the 500th element quickly",
        "Binary search",
        "Frequently inserting at the front",
        "Using as little memory per element as possible",
      ],
      answerIndex: 2,
      explanation:
        "Inserting at the head is O(1) for a linked list but O(n) for an array. Arrays win at indexing, binary search, and memory use.",
      concept: "Arrays vs linked lists",
    },
  ],
  Recursion: [
    {
      question: "What are the two essential parts of a recursive function?",
      options: [
        "A loop and a counter",
        "A base case and a recursive case",
        "A stack and a queue",
        "A return value and a global variable",
      ],
      answerIndex: 1,
      explanation:
        "The base case stops the recursion; the recursive case reduces the problem and calls the function again.",
      concept: "Base case",
    },
    {
      question: "What does factorial(3) return with: if n == 0: return 1; return n * factorial(n - 1)?",
      options: ["3", "6", "9", "0"],
      answerIndex: 1,
      explanation: "3 × 2 × 1 × factorial(0) = 3 × 2 × 1 × 1 = 6.",
      concept: "Tracing recursion",
    },
    {
      question: "A recursive function calls factorial(n) instead of factorial(n - 1). What happens?",
      options: [
        "It returns 0",
        "It returns the correct answer more slowly",
        "It never reaches the base case and causes a stack overflow",
        "Python automatically fixes it",
      ],
      answerIndex: 2,
      explanation:
        "The input never gets smaller, so the base case is never reached. Calls pile up until the stack runs out of space.",
      concept: "Infinite recursion",
    },
    {
      question: "Why is the naive recursive fib(n) slow?",
      options: [
        "Recursion is always slower than loops",
        "It recomputes the same subproblems many times",
        "It has no base case",
        "It uses floating-point numbers",
      ],
      answerIndex: 1,
      explanation:
        "fib(n) calls fib(n−1) and fib(n−2), which overlap heavily — O(2ⁿ) calls. Memoization caches results and makes it O(n).",
      concept: "Memoization",
    },
    {
      question: "What is stored in each stack frame during recursion?",
      options: [
        "Only the final answer",
        "That call's parameters and local variables",
        "A copy of the whole program",
        "Nothing — recursion doesn't use the stack",
      ],
      answerIndex: 1,
      explanation:
        "Each call gets its own frame, which is why deep recursion uses memory proportional to its depth.",
      concept: "Call stack",
    },
    {
      question: "In total(nums): if not nums: return 0; return nums[0] + total(nums[1:]) — what is total([4, 5])?",
      options: ["4", "5", "9", "0"],
      answerIndex: 2,
      explanation: "4 + total([5]) = 4 + (5 + total([])) = 4 + 5 + 0 = 9.",
      concept: "Tracing recursion",
    },
  ],
  "Binary Trees": [
    {
      question: "What is the inorder traversal of a tree with root 2, left child 1 and right child 3?",
      options: ["2 1 3", "1 2 3", "1 3 2", "3 2 1"],
      answerIndex: 1,
      explanation: "Inorder is left, node, right: 1, then 2, then 3. 2 1 3 is preorder; 1 3 2 is postorder.",
      concept: "Inorder traversal",
    },
    {
      question: "In a binary search tree, which statement is true?",
      options: [
        "Every node's left child is larger than the node",
        "All values in a node's left subtree are smaller than the node",
        "Only the direct children need to follow the ordering rule",
        "The tree is always balanced",
      ],
      answerIndex: 1,
      explanation:
        "The BST rule applies to the entire subtree, not just direct children. BSTs are not automatically balanced.",
      concept: "BST property",
    },
    {
      question: "What is the worst-case time to search a BST with n nodes?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answerIndex: 2,
      explanation:
        "If values are inserted in sorted order, the tree degenerates into a chain of height n − 1. O(log n) only holds for balanced trees.",
      concept: "Tree height",
    },
    {
      question: "What is a leaf node?",
      options: ["The root node", "A node with exactly one child", "A node with no children", "Any node at depth 1"],
      answerIndex: 2,
      explanation: "A leaf has no left or right child. The root is the node with no parent.",
      concept: "Tree vocabulary",
    },
    {
      question: "Which data structure does level-order (breadth-first) traversal use?",
      options: ["A stack", "A queue", "A hash map", "A sorted array"],
      answerIndex: 1,
      explanation:
        "A queue processes nodes first-in, first-out, so each level is finished before the next. Depth-first traversals use a stack (or recursion).",
      concept: "Level-order traversal",
    },
    {
      question: "What does an inorder traversal of a binary search tree produce?",
      options: [
        "Values in sorted order",
        "Values in insertion order",
        "Only the leaf values",
        "Values from the root downward, level by level",
      ],
      answerIndex: 0,
      explanation:
        "Left subtree (smaller), then the node, then right subtree (larger) — which yields sorted order.",
      concept: "Inorder traversal",
    },
  ],
};

export function pickDemoQuestions(topic: string, count: number): QuizQuestion[] | null {
  const key = Object.keys(DEMO_QUESTION_BANK).find((k) => k.toLowerCase() === topic.trim().toLowerCase());
  if (!key) return null;
  const pool = [...DEMO_QUESTION_BANK[key]];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
