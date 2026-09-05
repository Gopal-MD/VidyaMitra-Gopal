import { CodingQuestion } from '@/types/coding';

export const codingQuestions: CodingQuestion[] = [
  // ========== EASY PROBLEMS (10) ==========
  {
    id: 'code-easy-1',
    title: 'Two Sum',
    difficulty: 'easy',
    category: 'Arrays',
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    inputFormat: 'nums: number[], target: number',
    outputFormat: 'number[] (array of two indices)',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists'
    ],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '2,7,11,15|9',
        expectedOutput: '0,1',
        isHidden: false,
        weight: 1,
        description: 'Basic test case'
      },
      {
        id: 'test-2',
        input: '3,2,4|6',
        expectedOutput: '1,2',
        isHidden: false,
        weight: 1,
        description: 'Middle elements'
      },
      {
        id: 'test-3',
        input: '3,3|6',
        expectedOutput: '0,1',
        isHidden: true,
        weight: 1,
        description: 'Duplicate numbers'
      },
      {
        id: 'test-4',
        input: '-1,-2,-3,-4,-5|-8',
        expectedOutput: '2,4',
        isHidden: true,
        weight: 1,
        description: 'Negative numbers'
      }
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
  // Your code here
  
}

// Test
console.log(JSON.stringify(twoSum([2,7,11,15], 9)));`,
      python: `def two_sum(nums, target):
    # Your code here
    pass

# Test
print(two_sum([2,7,11,15], 9))`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] result = sol.twoSum(new int[]{2,7,11,15}, 9);
        System.out.println(java.util.Arrays.toString(result));
    }
}`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Your code here
    
}

int main() {
    vector<int> nums = {2,7,11,15};
    vector<int> result = twoSum(nums, 9);
    for(int i : result) cout << i << " ";
    return 0;
}`
    },
    hints: [
      'Try using a hash map to store numbers you\'ve seen',
      'For each number, check if (target - current number) exists in the hash map',
      'Time complexity can be O(n) with a single pass'
    ],
    topics: ['Arrays', 'Hash Table', 'Two Pass'],
    timeLimit: 15,
    memoryLimit: '256 MB'
  },

  {
    id: 'code-easy-2',
    title: 'Reverse String',
    difficulty: 'easy',
    category: 'Strings',
    description: `Write a function that reverses a string. The input string is given as an array of characters s.

You must do this by modifying the input array in-place with O(1) extra memory.`,
    inputFormat: 's: string[] (array of characters)',
    outputFormat: 'void (modify s in-place)',
    constraints: [
      '1 <= s.length <= 10^5',
      's[i] is a printable ASCII character'
    ],
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]'
      },
      {
        input: 's = ["H","a","n","n","a","h"]',
        output: '["h","a","n","n","a","H"]'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: 'h,e,l,l,o',
        expectedOutput: 'o,l,l,e,h',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: 'H,a,n,n,a,h',
        expectedOutput: 'h,a,n,n,a,H',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-3',
        input: 'a',
        expectedOutput: 'a',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function reverseString(s) {
  // Modify s in-place
  
}

// Test
let test = ["h","e","l","l","o"];
reverseString(test);
console.log(JSON.stringify(test));`,
      python: `def reverse_string(s):
    # Modify s in-place
    pass

# Test
test = ["h","e","l","l","o"]
reverse_string(test)
print(test)`,
      java: `class Solution {
    public void reverseString(char[] s) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        char[] test = {'h','e','l','l','o'};
        sol.reverseString(test);
        System.out.println(java.util.Arrays.toString(test));
    }
}`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

void reverseString(vector<char>& s) {
    // Your code here
    
}

int main() {
    vector<char> test = {'h','e','l','l','o'};
    reverseString(test);
    for(char c : test) cout << c << " ";
    return 0;
}`
    },
    hints: [
      'Use two pointers, one at the start and one at the end',
      'Swap characters and move pointers towards center',
      'Stop when pointers meet in the middle'
    ],
    topics: ['Two Pointers', 'String'],
    timeLimit: 10
  },

  {
    id: 'code-easy-3',
    title: 'Valid Palindrome',
    difficulty: 'easy',
    category: 'Strings',
    description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string s, return true if it is a palindrome, or false otherwise.`,
    inputFormat: 's: string',
    outputFormat: 'boolean',
    constraints: [
      '1 <= s.length <= 2 * 10^5',
      's consists only of printable ASCII characters'
    ],
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: 'true',
        explanation: 'After cleaning: "amanaplanacanalpanama" is a palindrome'
      },
      {
        input: 's = "race a car"',
        output: 'false',
        explanation: 'After cleaning: "raceacar" is not a palindrome'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: 'A man, a plan, a canal: Panama',
        expectedOutput: 'true',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: 'race a car',
        expectedOutput: 'false',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-3',
        input: ' ',
        expectedOutput: 'true',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function isPalindrome(s) {
  // Your code here
  
}

// Test
console.log(isPalindrome("A man, a plan, a canal: Panama"));`,
      python: `def is_palindrome(s):
    # Your code here
    pass

# Test
print(is_palindrome("A man, a plan, a canal: Panama"))`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        // Your code here
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.isPalindrome("A man, a plan, a canal: Panama"));
    }
}`,
      cpp: `#include <iostream>
#include <string>
using namespace std;

bool isPalindrome(string s) {
    // Your code here
    
}

int main() {
    cout << isPalindrome("A man, a plan, a canal: Panama") << endl;
    return 0;
}`
    },
    hints: [
      'First, clean the string by removing non-alphanumeric characters',
      'Convert to lowercase for case-insensitive comparison',
      'Use two pointers from both ends to check if palindrome'
    ],
    topics: ['Two Pointers', 'String'],
    timeLimit: 12
  },

  {
    id: 'code-easy-4',
    title: 'Maximum Subarray',
    difficulty: 'easy',
    category: 'Arrays',
    description: `Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

A subarray is a contiguous part of an array.`,
    inputFormat: 'nums: number[]',
    outputFormat: 'number (maximum sum)',
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4'
    ],
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum 6'
      },
      {
        input: 'nums = [1]',
        output: '1'
      },
      {
        input: 'nums = [5,4,-1,7,8]',
        output: '23'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '-2,1,-3,4,-1,2,1,-5,4',
        expectedOutput: '6',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: '1',
        expectedOutput: '1',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-3',
        input: '5,4,-1,7,8',
        expectedOutput: '23',
        isHidden: true,
        weight: 1
      },
      {
        id: 'test-4',
        input: '-1,-2,-3,-4',
        expectedOutput: '-1',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function maxSubArray(nums) {
  // Your code here (Kadane's Algorithm)
  
}

// Test
console.log(maxSubArray([-2,1,-3,4,-1,2,1,-5,4]));`,
      python: `def max_sub_array(nums):
    # Your code here (Kadane's Algorithm)
    pass

# Test
print(max_sub_array([-2,1,-3,4,-1,2,1,-5,4]))`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Your code here (Kadane's Algorithm)
        
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.maxSubArray(new int[]{-2,1,-3,4,-1,2,1,-5,4}));
    }
}`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int maxSubArray(vector<int>& nums) {
    // Your code here (Kadane's Algorithm)
    
}

int main() {
    vector<int> nums = {-2,1,-3,4,-1,2,1,-5,4};
    cout << maxSubArray(nums) << endl;
    return 0;
}`
    },
    hints: [
      'This is a classic dynamic programming problem (Kadane\'s Algorithm)',
      'Keep track of current sum and maximum sum seen so far',
      'If current sum becomes negative, reset it to 0'
    ],
    topics: ['Dynamic Programming', 'Arrays', 'Kadane\'s Algorithm'],
    timeLimit: 15
  },

  {
    id: 'code-easy-5',
    title: 'Merge Two Sorted Lists',
    difficulty: 'easy',
    category: 'Linked Lists',
    description: `You are given the heads of two sorted linked lists list1 and list2.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.`,
    inputFormat: 'list1: ListNode, list2: ListNode',
    outputFormat: 'ListNode (head of merged list)',
    constraints: [
      'The number of nodes in both lists is in the range [0, 50]',
      '-100 <= Node.val <= 100',
      'Both list1 and list2 are sorted in non-decreasing order'
    ],
    examples: [
      {
        input: 'list1 = [1,2,4], list2 = [1,3,4]',
        output: '[1,1,2,3,4,4]'
      },
      {
        input: 'list1 = [], list2 = []',
        output: '[]'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '1,2,4|1,3,4',
        expectedOutput: '1,1,2,3,4,4',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: '|',
        expectedOutput: '',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-3',
        input: '|0',
        expectedOutput: '0',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function ListNode(val, next) {
  this.val = (val===undefined ? 0 : val);
  this.next = (next===undefined ? null : next);
}

function mergeTwoLists(list1, list2) {
  // Your code here
  
}

// Test helper
console.log("Merge sorted lists");`,
      python: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def merge_two_lists(list1, list2):
    # Your code here
    pass

# Test
print("Merge sorted lists")`,
      java: `class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}

class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // Your code here
        
    }
}`,
      cpp: `struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(NULL) {}
};

ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    // Your code here
    
}`
    },
    hints: [
      'Use a dummy node to simplify edge cases',
      'Compare values from both lists and attach smaller node',
      'Don\'t forget to attach remaining nodes from either list'
    ],
    topics: ['Linked List', 'Recursion'],
    timeLimit: 15
  },

  // ========== MEDIUM PROBLEMS (7) ==========
  {
    id: 'code-medium-1',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    category: 'Sliding Window',
    description: `Given a string s, find the length of the longest substring without repeating characters.`,
    inputFormat: 's: string',
    outputFormat: 'number (length of longest substring)',
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces'
    ],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with length 3'
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with length 1'
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with length 3'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: 'abcabcbb',
        expectedOutput: '3',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: 'bbbbb',
        expectedOutput: '1',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-3',
        input: 'pwwkew',
        expectedOutput: '3',
        isHidden: true,
        weight: 1
      },
      {
        id: 'test-4',
        input: '',
        expectedOutput: '0',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function lengthOfLongestSubstring(s) {
  // Your code here (Sliding Window + Hash Map)
  
}

// Test
console.log(lengthOfLongestSubstring("abcabcbb"));`,
      python: `def length_of_longest_substring(s):
    # Your code here (Sliding Window + Hash Map)
    pass

# Test
print(length_of_longest_substring("abcabcbb"))`,
      java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Your code here
        
    }
}`,
      cpp: `#include <string>
using namespace std;

int lengthOfLongestSubstring(string s) {
    // Your code here
    
}`
    },
    hints: [
      'Use sliding window technique with two pointers',
      'Maintain a hash map to track character positions',
      'When duplicate found, move left pointer past the previous occurrence'
    ],
    topics: ['Hash Table', 'Sliding Window', 'String'],
    timeLimit: 20
  },

  {
    id: 'code-medium-2',
    title: 'Container With Most Water',
    difficulty: 'medium',
    category: 'Two Pointers',
    description: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store.`,
    inputFormat: 'height: number[]',
    outputFormat: 'number (maximum area)',
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4'
    ],
    examples: [
      {
        input: 'height = [1,8,6,2,5,4,8,3,7]',
        output: '49',
        explanation: 'Lines at index 1 and 8 form container with area 7 * 7 = 49'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '1,8,6,2,5,4,8,3,7',
        expectedOutput: '49',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: '1,1',
        expectedOutput: '1',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-3',
        input: '4,3,2,1,4',
        expectedOutput: '16',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function maxArea(height) {
  // Your code here (Two Pointers)
  
}

// Test
console.log(maxArea([1,8,6,2,5,4,8,3,7]));`,
      python: `def max_area(height):
    # Your code here (Two Pointers)
    pass

# Test
print(max_area([1,8,6,2,5,4,8,3,7]))`,
      java: `class Solution {
    public int maxArea(int[] height) {
        // Your code here
        
    }
}`,
      cpp: `int maxArea(vector<int>& height) {
    // Your code here
    
}`
    },
    hints: [
      'Start with two pointers at both ends',
      'Area = min(height[left], height[right]) * (right - left)',
      'Move the pointer pointing to shorter line inward'
    ],
    topics: ['Array', 'Two Pointers', 'Greedy'],
    timeLimit: 18
  },

  {
    id: 'code-medium-3',
    title: 'Group Anagrams',
    difficulty: 'medium',
    category: 'Hash Maps',
    description: `Given an array of strings strs, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    inputFormat: 'strs: string[]',
    outputFormat: 'string[][] (grouped anagrams)',
    constraints: [
      '1 <= strs.length <= 10^4',
      '0 <= strs[i].length <= 100',
      'strs[i] consists of lowercase English letters'
    ],
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]'
      },
      {
        input: 'strs = [""]',
        output: '[[""]]'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: 'eat,tea,tan,ate,nat,bat',
        expectedOutput: 'bat|nat,tan|ate,eat,tea',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: 'a',
        expectedOutput: 'a',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function groupAnagrams(strs) {
  // Your code here
  
}

// Test
console.log(JSON.stringify(groupAnagrams(["eat","tea","tan","ate","nat","bat"])));`,
      python: `def group_anagrams(strs):
    # Your code here
    pass

# Test
print(group_anagrams(["eat","tea","tan","ate","nat","bat"]))`,
      java: `class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        // Your code here
        
    }
}`,
      cpp: `vector<vector<string>> groupAnagrams(vector<string>& strs) {
    // Your code here
    
}`
    },
    hints: [
      'Sort each string and use sorted version as key in hash map',
      'All anagrams will have the same sorted string',
      'Group strings by their sorted keys'
    ],
    topics: ['Array', 'Hash Table', 'String', 'Sorting'],
    timeLimit: 20
  },

  {
    id: 'code-medium-4',
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    category: 'Arrays',
    description: `Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].

The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in O(n) time and without using the division operation.`,
    inputFormat: 'nums: number[]',
    outputFormat: 'number[]',
    constraints: [
      '2 <= nums.length <= 10^5',
      '-30 <= nums[i] <= 30',
      'The product of any prefix or suffix fits in 32-bit integer'
    ],
    examples: [
      {
        input: 'nums = [1,2,3,4]',
        output: '[24,12,8,6]'
      },
      {
        input: 'nums = [-1,1,0,-3,3]',
        output: '[0,0,9,0,0]'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '1,2,3,4',
        expectedOutput: '24,12,8,6',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: '-1,1,0,-3,3',
        expectedOutput: '0,0,9,0,0',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function productExceptSelf(nums) {
  // Your code here (prefix & suffix products)
  
}

// Test
console.log(JSON.stringify(productExceptSelf([1,2,3,4])));`,
      python: `def product_except_self(nums):
    # Your code here
    pass

# Test
print(product_except_self([1,2,3,4]))`,
      java: `class Solution {
    public int[] productExceptSelf(int[] nums) {
        // Your code here
        
    }
}`,
      cpp: `vector<int> productExceptSelf(vector<int>& nums) {
    // Your code here
    
}`
    },
    hints: [
      'Think about using prefix and suffix products',
      'First pass: calculate prefix products (product of all elements before i)',
      'Second pass: calculate suffix products and multiply with prefix'
    ],
    topics: ['Array', 'Prefix Sum'],
    timeLimit: 20
  },

  {
    id: 'code-medium-5',
    title: 'Coin Change',
    difficulty: 'medium',
    category: 'Dynamic Programming',
    description: `You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

You may assume that you have an infinite number of each kind of coin.`,
    inputFormat: 'coins: number[], amount: number',
    outputFormat: 'number (minimum coins needed, or -1)',
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4'
    ],
    examples: [
      {
        input: 'coins = [1,2,5], amount = 11',
        output: '3',
        explanation: '11 = 5 + 5 + 1'
      },
      {
        input: 'coins = [2], amount = 3',
        output: '-1'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '1,2,5|11',
        expectedOutput: '3',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: '2|3',
        expectedOutput: '-1',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-3',
        input: '1|0',
        expectedOutput: '0',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function coinChange(coins, amount) {
  // Your code here (DP)
  
}

// Test
console.log(coinChange([1,2,5], 11));`,
      python: `def coin_change(coins, amount):
    # Your code here (DP)
    pass

# Test
print(coin_change([1,2,5], 11))`,
      java: `class Solution {
    public int coinChange(int[] coins, int amount) {
        // Your code here
        
    }
}`,
      cpp: `int coinChange(vector<int>& coins, int amount) {
    // Your code here
    
}`
    },
    hints: [
      'Use dynamic programming with bottom-up approach',
      'Create a DP array where dp[i] = minimum coins needed for amount i',
      'For each amount, try all coin denominations'
    ],
    topics: ['Array', 'Dynamic Programming', 'Breadth-First Search'],
    timeLimit: 25
  },

  {
    id: 'code-medium-6',
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'medium',
    category: 'Trees',
    description: `Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).`,
    inputFormat: 'root: TreeNode',
    outputFormat: 'number[][] (values by level)',
    constraints: [
      'The number of nodes in the tree is in the range [0, 2000]',
      '-1000 <= Node.val <= 1000'
    ],
    examples: [
      {
        input: 'root = [3,9,20,null,null,15,7]',
        output: '[[3],[9,20],[15,7]]'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '3,9,20,null,null,15,7',
        expectedOutput: '3|9,20|15,7',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: '1',
        expectedOutput: '1',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function TreeNode(val, left, right) {
  this.val = (val===undefined ? 0 : val);
  this.left = (left===undefined ? null : left);
  this.right = (right===undefined ? null : right);
}

function levelOrder(root) {
  // Your code here (BFS with Queue)
  
}`,
      python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def level_order(root):
    # Your code here (BFS with Queue)
    pass`,
      java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        // Your code here
        
    }
}`,
      cpp: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(NULL), right(NULL) {}
};

vector<vector<int>> levelOrder(TreeNode* root) {
    // Your code here
    
}`
    },
    hints: [
      'Use Breadth-First Search (BFS) with a queue',
      'Process nodes level by level',
      'Keep track of number of nodes at current level'
    ],
    topics: ['Tree', 'Breadth-First Search', 'Binary Tree'],
    timeLimit: 20
  },

  {
    id: 'code-medium-7',
    title: 'Valid Sudoku',
    difficulty: 'medium',
    category: 'Hash Maps',
    description: `Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to the following rules:

1. Each row must contain the digits 1-9 without repetition.
2. Each column must contain the digits 1-9 without repetition.
3. Each of the nine 3 x 3 sub-boxes must contain the digits 1-9 without repetition.

Note: A Sudoku board (partially filled) could be valid but is not necessarily solvable. Only the filled cells need to be validated.`,
    inputFormat: 'board: string[][] (9x9 grid)',
    outputFormat: 'boolean',
    constraints: [
      'board.length == 9',
      'board[i].length == 9',
      'board[i][j] is a digit 1-9 or \'.\'.'
    ],
    examples: [
      {
        input: 'Board with valid configuration',
        output: 'true'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '5,3,.,.,7,.,.,.,.|6,.,.,1,9,5,.,.,.|.,9,8,.,.,.,.,6,.|8,.,.,.,6,.,.,.,3|4,.,.,8,.,3,.,.,1|7,.,.,.,2,.,.,.,6|.,6,.,.,.,.,2,8,.|.,.,.,4,1,9,.,.,5|.,.,.,.,8,.,.,7,9',
        expectedOutput: 'true',
        isHidden: false,
        weight: 1,
        description: 'Valid standard board'
      },
      {
        id: 'test-2',
        input: '8,3,.,.,7,.,.,.,.|6,.,.,1,9,5,.,.,.|.,9,8,.,.,.,.,6,.|8,.,.,.,6,.,.,.,3|4,.,.,8,.,3,.,.,1|7,.,.,.,2,.,.,.,6|.,6,.,.,.,.,2,8,.|.,.,.,4,1,9,.,.,5|.,.,.,.,8,.,.,7,9',
        expectedOutput: 'false',
        isHidden: true,
        weight: 1,
        description: 'Invalid board - duplicate 8 in column'
      }
    ],
    starterCode: {
      javascript: `function isValidSudoku(board) {
  // Your code here
  
}`,
      python: `def is_valid_sudoku(board):
    # Your code here
    pass`,
      java: `class Solution {
    public boolean isValidSudoku(char[][] board) {
        // Your code here
        
    }
}`,
      cpp: `bool isValidSudoku(vector<vector<char>>& board) {
    // Your code here
    
}`
    },
    hints: [
      'Use hash sets to track seen numbers in rows, columns, and boxes',
      'Box index can be calculated as (row/3, col/3)',
      'Check all three constraints simultaneously in one pass'
    ],
    topics: ['Array', 'Hash Table', 'Matrix'],
    timeLimit: 25
  },

  // ========== HARD PROBLEMS (3) ==========
  {
    id: 'code-hard-1',
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    category: 'Two Pointers',
    description: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    inputFormat: 'height: number[]',
    outputFormat: 'number (units of water trapped)',
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5'
    ],
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'Total of 6 units of rain water are trapped'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '0,1,0,2,1,0,1,3,2,1,2,1',
        expectedOutput: '6',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: '4,2,0,3,2,5',
        expectedOutput: '9',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function trap(height) {
  // Your code here
  
}

// Test
console.log(trap([0,1,0,2,1,0,1,3,2,1,2,1]));`,
      python: `def trap(height):
    # Your code here
    pass

# Test
print(trap([0,1,0,2,1,0,1,3,2,1,2,1]))`,
      java: `class Solution {
    public int trap(int[] height) {
        // Your code here
        
    }
}`,
      cpp: `int trap(vector<int>& height) {
    // Your code here
    
}`
    },
    hints: [
      'Water trapped at position i = min(max_left, max_right) - height[i]',
      'Use two pointers approach from both ends',
      'Keep track of maximum heights seen from both sides'
    ],
    topics: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
    timeLimit: 30
  },

  {
    id: 'code-hard-2',
    title: 'Median of Two Sorted Arrays',
    difficulty: 'hard',
    category: 'Searching',
    description: `Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log (m+n)).`,
    inputFormat: 'nums1: number[], nums2: number[]',
    outputFormat: 'number (median)',
    constraints: [
      'nums1.length == m',
      'nums2.length == n',
      '0 <= m <= 1000',
      '0 <= n <= 1000',
      '1 <= m + n <= 2000',
      '-10^6 <= nums1[i], nums2[i] <= 10^6'
    ],
    examples: [
      {
        input: 'nums1 = [1,3], nums2 = [2]',
        output: '2.00000',
        explanation: 'Merged array = [1,2,3] and median is 2'
      },
      {
        input: 'nums1 = [1,2], nums2 = [3,4]',
        output: '2.50000',
        explanation: 'Merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '1,3|2',
        expectedOutput: '2',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: '1,2|3,4',
        expectedOutput: '2.5',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function findMedianSortedArrays(nums1, nums2) {
  // Your code here (Binary Search)
  
}

// Test
console.log(findMedianSortedArrays([1,3], [2]));`,
      python: `def find_median_sorted_arrays(nums1, nums2):
    # Your code here (Binary Search)
    pass

# Test  
print(find_median_sorted_arrays([1,3], [2]))`,
      java: `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        // Your code here
        
    }
}`,
      cpp: `double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
    // Your code here
    
}`
    },
    hints: [
      'Use binary search on the smaller array',
      'Partition both arrays such that left half has same elements as right half',
      'Check if partition is valid using max of left and min of right'
    ],
    topics: ['Array', 'Binary Search', 'Divide and Conquer'],
    timeLimit: 35
  },

  {
    id: 'code-hard-3',
    title: 'Longest Valid Parentheses',
    difficulty: 'hard',
    category: 'Dynamic Programming',
    description: `Given a string containing just the characters '(' and ')', return the length of the longest valid (well-formed) parentheses substring.`,
    inputFormat: 's: string',
    outputFormat: 'number (length)',
    constraints: [
      '0 <= s.length <= 3 * 10^4',
      's[i] is \'(\', or \')\'.'
    ],
    examples: [
      {
        input: 's = "(()"',
        output: '2',
        explanation: 'The longest valid parentheses substring is "()"'
      },
      {
        input: 's = ")()())"',
        output: '4',
        explanation: 'The longest valid parentheses substring is "()()"'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '(()',
        expectedOutput: '2',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-2',
        input: ')()())',
        expectedOutput: '4',
        isHidden: false,
        weight: 1
      },
      {
        id: 'test-3',
        input: '',
        expectedOutput: '0',
        isHidden: true,
        weight: 1
      }
    ],
    starterCode: {
      javascript: `function longestValidParentheses(s) {
  // Your code here (DP or Stack)
  
}

// Test
console.log(longestValidParentheses("(()"));`,
      python: `def longest_valid_parentheses(s):
    # Your code here (DP or Stack)
    pass

# Test
print(longest_valid_parentheses("(()"))`,
      java: `class Solution {
    public int longestValidParentheses(String s) {
        // Your code here
        
    }
}`,
      cpp: `int longestValidParentheses(string s) {
    // Your code here
    
}`
    },
    hints: [
      'Can use dynamic programming or stack approach',
      'DP: dp[i] = length of longest valid parentheses ending at index i',
      'Stack: Track indices of unmatched parentheses'
    ],
    topics: ['String', 'Dynamic Programming', 'Stack'],
    timeLimit: 30
  },

  // ========== ADDITIONAL EASY PROBLEMS ==========
  {
    id: 'code-easy-6',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    category: 'Stack',
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    inputFormat: 's: string',
    outputFormat: 'boolean',
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\''
    ],
    examples: [
      {
        input: 's = "()"',
        output: 'true'
      },
      {
        input: 's = "()[]{}"',
        output: 'true'
      },
      {
        input: 's = "(]"',
        output: 'false'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '()',
        expectedOutput: 'true',
        isHidden: false,
        weight: 1,
        description: 'Simple valid case'
      },
      {
        id: 'test-2',
        input: '()[]{}',
        expectedOutput: 'true',
        isHidden: false,
        weight: 1,
        description: 'Multiple types'
      },
      {
        id: 'test-3',
        input: '(]',
        expectedOutput: 'false',
        isHidden: true,
        weight: 1,
        description: 'Invalid case'
      }
    ],
    starterCode: {
      javascript: `function isValid(s) {
  // Your code here
  
}

// Test
console.log(isValid("()"));`,
      python: `def is_valid(s):
    # Your code here
    pass

# Test
print(is_valid("()"))`,
      java: `class Solution {
    public boolean isValid(String s) {
        // Your code here
        
    }
}`,
      cpp: `bool isValid(string s) {
    // Your code here
    
}`
    },
    hints: [
      'Use a stack to keep track of opening brackets',
      'When you see a closing bracket, check if it matches the top of stack',
      'Stack should be empty at the end if string is valid'
    ],
    topics: ['Stack', 'String'],
    timeLimit: 15
  },

  {
    id: 'code-easy-7',
    title: 'Palindrome Number',
    difficulty: 'easy',
    category: 'Math',
    description: `Given an integer x, return true if x is a palindrome, and false otherwise.

An integer is a palindrome when it reads the same backward as forward.`,
    inputFormat: 'x: number',
    outputFormat: 'boolean',
    constraints: [
      '-2^31 <= x <= 2^31 - 1'
    ],
    examples: [
      {
        input: 'x = 121',
        output: 'true',
        explanation: '121 reads as 121 from left to right and from right to left.'
      },
      {
        input: 'x = -121',
        output: 'false',
        explanation: 'From left to right, it reads -121. From right to left, it becomes 121-.'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '121',
        expectedOutput: 'true',
        isHidden: false,
        weight: 1,
        description: 'Positive palindrome'
      },
      {
        id: 'test-2',
        input: '-121',
        expectedOutput: 'false',
        isHidden: false,
        weight: 1,
        description: 'Negative number'
      },
      {
        id: 'test-3',
        input: '10',
        expectedOutput: 'false',
        isHidden: true,
        weight: 1,
        description: 'Not palindrome'
      }
    ],
    starterCode: {
      javascript: `function isPalindrome(x) {
  // Your code here
  
}

// Test
console.log(isPalindrome(121));`,
      python: `def is_palindrome(x):
    # Your code here
    pass

# Test
print(is_palindrome(121))`,
      java: `class Solution {
    public boolean isPalindrome(int x) {
        // Your code here
        
    }
}`,
      cpp: `bool isPalindrome(int x) {
    // Your code here
    
}`
    },
    hints: [
      'Can convert to string and check if it equals its reverse',
      'Or reverse the number mathematically without string conversion',
      'Negative numbers are never palindromes'
    ],
    topics: ['Math', 'String'],
    timeLimit: 10
  },

  {
    id: 'code-easy-8',
    title: 'Remove Duplicates from Sorted Array',
    difficulty: 'easy',
    category: 'Arrays',
    description: `Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same.

Return k after placing the final result in the first k slots of nums.`,
    inputFormat: 'nums: number[]',
    outputFormat: 'number (length of unique elements)',
    constraints: [
      '1 <= nums.length <= 3 * 10^4',
      '-100 <= nums[i] <= 100',
      'nums is sorted in non-decreasing order'
    ],
    examples: [
      {
        input: 'nums = [1,1,2]',
        output: '2',
        explanation: 'Your function should return k = 2, with the first two elements of nums being 1 and 2 respectively.'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '1,1,2',
        expectedOutput: '2',
        isHidden: false,
        weight: 1,
        description: 'Basic case'
      },
      {
        id: 'test-2',
        input: '0,0,1,1,1,2,2,3,3,4',
        expectedOutput: '5',
        isHidden: false,
        weight: 1,
        description: 'Multiple duplicates'
      }
    ],
    starterCode: {
      javascript: `function removeDuplicates(nums) {
  // Your code here
  
}

// Test
console.log(removeDuplicates([1,1,2]));`,
      python: `def remove_duplicates(nums):
    # Your code here
    pass

# Test
print(remove_duplicates([1,1,2]))`,
      java: `class Solution {
    public int removeDuplicates(int[] nums) {
        // Your code here
        
    }
}`,
      cpp: `int removeDuplicates(vector<int>& nums) {
    // Your code here
    
}`
    },
    hints: [
      'Use two pointers approach - one for reading, one for writing',
      'Only move the write pointer when you find a new unique element',
      'Since array is sorted, duplicates will be adjacent'
    ],
    topics: ['Arrays', 'Two Pointers'],
    timeLimit: 15
  },

  // ========== ADDITIONAL MEDIUM PROBLEMS ==========
  {
    id: 'code-medium-8',
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'medium',
    category: 'Trees',
    description: `Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).`,
    inputFormat: 'root: TreeNode (binary tree root)',
    outputFormat: 'number[][] (array of arrays representing each level)',
    constraints: [
      'The number of nodes in the tree is in the range [0, 2000]',
      '-1000 <= Node.val <= 1000'
    ],
    examples: [
      {
        input: 'root = [3,9,20,null,null,15,7]',
        output: '[[3],[9,20],[15,7]]'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '3,9,20,null,null,15,7',
        expectedOutput: '3|9,20|15,7',
        isHidden: false,
        weight: 1,
        description: 'Regular tree'
      },
      {
        id: 'test-2',
        input: '1',
        expectedOutput: '1',
        isHidden: false,
        weight: 1,
        description: 'Single node'
      }
    ],
    starterCode: {
      javascript: `function levelOrder(root) {
  // Your code here
  
}

// Test with tree creation helper
console.log(levelOrder(createTree([3,9,20,null,null,15,7])));`,
      python: `def level_order(root):
    # Your code here
    pass

# Test
print(level_order(create_tree([3,9,20,None,None,15,7])))`,
      java: `class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        // Your code here
        
    }
}`,
      cpp: `vector<vector<int>> levelOrder(TreeNode* root) {
    // Your code here
    
}`
    },
    hints: [
      'Use BFS (breadth-first search) with a queue',
      'Keep track of level size to group nodes by level',
      'Process nodes level by level, adding children to queue'
    ],
    topics: ['Trees', 'BFS', 'Queue'],
    timeLimit: 20
  },

  {
    id: 'code-medium-9',
    title: 'Rotate Image',
    difficulty: 'medium',
    category: 'Arrays',
    description: `You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).

You have to rotate the image in-place, which means you have to modify the input 2D matrix directly.`,
    inputFormat: 'matrix: number[][]',
    outputFormat: 'void (modify in-place)',
    constraints: [
      'n == matrix.length == matrix[i].length',
      '1 <= n <= 20',
      '-1000 <= matrix[i][j] <= 1000'
    ],
    examples: [
      {
        input: 'matrix = [[1,2,3],[4,5,6],[7,8,9]]',
        output: '[[7,4,1],[8,5,2],[9,6,3]]'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '1,2,3|4,5,6|7,8,9',
        expectedOutput: '7,4,1|8,5,2|9,6,3',
        isHidden: false,
        weight: 1,
        description: '3x3 matrix'
      },
      {
        id: 'test-2',
        input: '5,1,9,11|2,4,8,10|13,3,6,7|15,14,12,16',
        expectedOutput: '15,13,2,5|14,3,4,1|12,6,8,9|16,7,10,11',
        isHidden: true,
        weight: 1,
        description: '4x4 matrix'
      }
    ],
    starterCode: {
      javascript: `function rotate(matrix) {
  // Your code here (modify in-place)
  
}

// Test
let test = [[1,2,3],[4,5,6],[7,8,9]];
rotate(test);
console.log(test);`,
      python: `def rotate(matrix):
    # Your code here (modify in-place)
    pass

# Test
test = [[1,2,3],[4,5,6],[7,8,9]]
rotate(test)
print(test)`,
      java: `class Solution {
    public void rotate(int[][] matrix) {
        // Your code here
        
    }
}`,
      cpp: `void rotate(vector<vector<int>>& matrix) {
    // Your code here
    
}`
    },
    hints: [
      'Try transposing the matrix first, then reverse each row',
      'Or rotate layer by layer from outside to inside',
      'matrix[i][j] goes to matrix[j][n-1-i] after rotation'
    ],
    topics: ['Arrays', 'Matrix', 'Math'],
    timeLimit: 20
  },

  // ========== ADDITIONAL HARD PROBLEMS ==========
  {
    id: 'code-hard-4',
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    category: 'Arrays',
    description: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    inputFormat: 'height: number[]',
    outputFormat: 'number (total trapped water)',
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 3 * 10^4'
    ],
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'The above elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.'
      }
    ],
    testCases: [
      {
        id: 'test-1',
        input: '0,1,0,2,1,0,1,3,2,1,2,1',
        expectedOutput: '6',
        isHidden: false,
        weight: 1,
        description: 'Basic example'
      },
      {
        id: 'test-2',
        input: '4,2,0,3,2,5',
        expectedOutput: '9',
        isHidden: false,
        weight: 1,
        description: 'Another example'
      }
    ],
    starterCode: {
      javascript: `function trap(height) {
  // Your code here
  
}

// Test
console.log(trap([0,1,0,2,1,0,1,3,2,1,2,1]));`,
      python: `def trap(height):
    # Your code here
    pass

# Test
print(trap([0,1,0,2,1,0,1,3,2,1,2,1]))`,
      java: `class Solution {
    public int trap(int[] height) {
        // Your code here
        
    }
}`,
      cpp: `int trap(vector<int>& height) {
    // Your code here
    
}`
    },
    hints: [
      'Think about the water level at each position',
      'Water level = min(max_left_height, max_right_height)',
      'Can use two pointers or dynamic programming approach'
    ],
    topics: ['Arrays', 'Two Pointers', 'Dynamic Programming'],
    timeLimit: 25
  }
];

// Helper function to get random questions by difficulty
export const getRandomQuestionsByDifficulty = (
  easy: number = 2,
  medium: number = 2,
  hard: number = 1
): CodingQuestion[] => {
  const easyQuestions = codingQuestions.filter(q => q.difficulty === 'easy');
  const mediumQuestions = codingQuestions.filter(q => q.difficulty === 'medium');
  const hardQuestions = codingQuestions.filter(q => q.difficulty === 'hard');

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  return [
    ...shuffleArray(easyQuestions).slice(0, easy),
    ...shuffleArray(mediumQuestions).slice(0, medium),
    ...shuffleArray(hardQuestions).slice(0, hard)
  ];
};

// Get questions by category
export const getQuestionsByCategory = (category: string): CodingQuestion[] => {
  return codingQuestions.filter(q => q.category === category);
};

// Get question by ID
export const getQuestionById = (id: string): CodingQuestion | undefined => {
  return codingQuestions.find(q => q.id === id);
};
