// Offline sample replies for Demo Mode. Only used when GEMINI_API_KEY is missing or Gemini
// fails mid-presentation, so the demo still works. Live Gemini responses are used otherwise.

export const DEMO_REPLIES: Record<string, { explain: string; simple: string; example: string }> = {
  Arrays: {
    explain: `Let's start from the simplest idea.

An **array** is a row of boxes sitting side by side in memory. Each box holds one value, and each box has a number — its **index** — starting at 0.

Because the boxes are next to each other, the computer can jump straight to any box with a formula:

\`address = start + index × box_size\`

That's why \`arr[5]\` is instant (O(1)): no searching, just arithmetic.

The trade-off: inserting in the middle means shifting every later box one step to the right, which is O(n).

**Quick check:** if an array has 6 elements, what is the index of the last one?`,
    simple: `Think of an array like a row of numbered lockers in a hallway.

- Every locker is the same size and they're all in one line.
- If you know the locker number, you walk straight to it — no need to check the others.
- But if you want to squeeze a new locker into the middle, everyone after it has to move down one spot.

So: **reading by position is fast, inserting in the middle is slow.**

Does that picture make sense? Which do you think is faster: adding to the end or adding to the front?`,
    example: `Here's a worked example — reversing an array in place with two pointers:

\`\`\`python
def reverse(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        arr[left], arr[right] = arr[right], arr[left]
        left += 1
        right -= 1
\`\`\`

For \`[1, 2, 3, 4]\`:
1. Swap positions 0 and 3 → \`[4, 2, 3, 1]\`
2. Swap positions 1 and 2 → \`[4, 3, 2, 1]\`
3. Now \`left\` = 2 and \`right\` = 1, so we stop.

It uses O(n) time and no extra array.

**Your turn:** how many swaps would this make for an array of 7 elements?`,
  },
  "Linked Lists": {
    explain: `Let's build it up from nothing.

A **linked list** is a chain of **nodes**. Each node holds:
1. a value, and
2. a pointer to the next node.

The list only remembers the first node, the **head**. The last node points to \`None\`.

Because nodes can be anywhere in memory, there's no formula to jump to position 5 — you have to follow the chain: head → next → next… That makes access by index O(n).

What you gain: adding a node at the front is O(1). Make the new node point at the old head, then call it the new head.

**Quick check:** why must you link the new node to the old head *before* updating \`head\`?`,
    simple: `Picture a treasure hunt. Each clue tells you where the next clue is hidden.

- To find the 5th clue, you *have* to read clues 1 to 4 first.
- But adding a new first clue is easy: write a new card that points to the old first clue.

That's a linked list: **easy to add at the front, slow to jump to the middle.**

Can you think of why an array doesn't have this "follow the clues" problem?`,
    example: `Here's how you insert at the head:

\`\`\`python
def push_front(head, value):
    node = Node(value)
    node.next = head   # 1. link to the old list first
    return node        # 2. the new node is the new head
\`\`\`

Starting with \`3 → 7 → None\`, calling \`push_front(head, 1)\` gives \`1 → 3 → 7 → None\`.

If you swapped the two steps, you'd lose the reference to \`3 → 7\` — the rest of the list would be gone.

**Try this:** what would \`push_front\` produce if the list was empty (\`head = None\`)?`,
  },
  Recursion: {
    explain: `Let's start from the simplest idea.

**Recursion** means a function solves a problem by calling itself on a *smaller version of the same problem*.

Every recursive function needs two parts:
1. **Base case** — the smallest version, answered directly.
2. **Recursive case** — shrink the problem, call yourself, and use the result.

\`\`\`python
def factorial(n):
    if n == 0:           # base case
        return 1
    return n * factorial(n - 1)   # recursive case
\`\`\`

\`factorial(3)\` → \`3 * factorial(2)\` → \`3 * 2 * factorial(1)\` → \`3 * 2 * 1 * factorial(0)\` → \`6\`.

**Quick check:** what would happen if we removed the \`if n == 0\` line?`,
    simple: `Imagine you're in a long queue and want to know your position, but you can only see the person in front of you.

You ask them: "What's your position?" They ask the person in front of *them*, and so on — until the person at the very front says "I'm number 1." (That's the **base case**.)

Then the answers come back: 2, 3, 4… until it reaches you.

That's recursion: **ask a smaller version of the same question, and build your answer from theirs.**

In this story, what would go wrong if nobody was at the front to say "I'm number 1"?`,
    example: `Here's a small example — adding up a list:

\`\`\`python
def total(nums):
    if not nums:              # base case: empty list
        return 0
    return nums[0] + total(nums[1:])
\`\`\`

Tracing \`total([4, 5, 6])\`:
1. \`4 + total([5, 6])\`
2. \`4 + (5 + total([6]))\`
3. \`4 + (5 + (6 + total([])))\`
4. \`4 + 5 + 6 + 0 = 15\`

Notice how each call works on a shorter list until it hits the base case.

**Your turn:** what does \`total([2, 2, 2])\` return, and how many calls does it make?`,
  },
  "Binary Trees": {
    explain: `Let's start with the vocabulary, then the key idea.

A **binary tree** is made of nodes. Each node has a value and up to two children: **left** and **right**.
- The top node is the **root**.
- A node with no children is a **leaf**.

The key idea: every child is itself the root of a smaller tree. So most tree algorithms are recursive — solve the left subtree, solve the right subtree, combine:

\`\`\`python
def count_nodes(node):
    if node is None:
        return 0
    return 1 + count_nodes(node.left) + count_nodes(node.right)
\`\`\`

**Quick check:** in \`count_nodes\`, what is the base case, and why is it needed?`,
    simple: `Think of a family tree turned upside down.

- One person at the top (the **root**).
- Each person can have at most two children (left and right).
- People with no children are **leaves**.

Now the trick: if you look at just one child and everyone below them, *that's also a tree*. So to count everyone, you count the left family, count the right family, and add 1 for yourself.

Does that "a tree is made of smaller trees" idea make sense?`,
    example: `Here's a worked example of the three depth-first traversals on this tree:

\`\`\`
      2
     / \\
    1   3
\`\`\`

- **Preorder** (node, left, right): 2, 1, 3
- **Inorder** (left, node, right): 1, 2, 3
- **Postorder** (left, right, node): 1, 3, 2

Notice that inorder gave sorted order — that's always true for a **binary search tree**.

**Your turn:** what is the preorder traversal if we add 4 as the right child of 3?`,
  },
};

export const GENERIC_REPLY = (topic: string) =>
  `Good question. Let's connect it back to **${topic}**.

I'm running in offline demo mode right now, so I can only give prepared explanations. Try one of the suggested actions — **Explain simply**, **Give an example**, **Give me a question** or **Summarize** — or add a Gemini API key for live answers to any question.`;
