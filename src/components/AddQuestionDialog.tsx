// Add Question Dialog Component
// Allows admins to create new coding questions

import React, { useState } from 'react';
import { Plus, X, Code, TestTube } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CodingQuestion, ProgrammingLanguage, TestCase } from '@/types/coding';
import { toast } from '@/hooks/use-toast';

interface AddQuestionDialogProps {
  onQuestionAdded: (question: CodingQuestion) => void;
}

export const AddQuestionDialog: React.FC<AddQuestionDialogProps> = ({ onQuestionAdded }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CodingQuestion>>({
    title: '',
    description: '',
    difficulty: 'easy',
    category: 'Arrays',
    inputFormat: '',
    outputFormat: '',
    hints: ['', ''],
    testCases: [
      { id: 'test-1', input: '', expectedOutput: '', isHidden: false, weight: 1, description: '' },
      { id: 'test-2', input: '', expectedOutput: '', isHidden: false, weight: 1, description: '' }
    ],
    constraints: [''],
    examples: [
      { input: '', output: '', explanation: '' },
      { input: '', output: '', explanation: '' }
    ],
    topics: [''],
    starterCode: {
      javascript: '// Write your solution here\nfunction solution() {\n  \n}',
      python: '# Write your solution here\ndef solution():\n    pass',
      java: '// Write your solution here\npublic class Solution {\n    public void solution() {\n        \n    }\n}',
      cpp: '// Write your solution here\n#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    \n}'
    },
    timeLimit: 30,
    memoryLimit: '256 MB'
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      difficulty: 'easy',
      category: 'Arrays',
      inputFormat: '',
      outputFormat: '',
      hints: ['', ''],
      testCases: [
        { id: 'test-1', input: '', expectedOutput: '', isHidden: false, weight: 1, description: '' },
        { id: 'test-2', input: '', expectedOutput: '', isHidden: false, weight: 1, description: '' }
      ],
      constraints: [''],
      examples: [
        { input: '', output: '', explanation: '' },
        { input: '', output: '', explanation: '' }
      ],
      topics: [''],
      starterCode: {
        javascript: '// Write your solution here\nfunction solution() {\n  \n}',
        python: '# Write your solution here\ndef solution():\n    pass',
        java: '// Write your solution here\npublic class Solution {\n    public void solution() {\n        \n    }\n}',
        cpp: '// Write your solution here\n#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    \n}'
      },
      timeLimit: 30,
      memoryLimit: '256 MB'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Create new question
    const newQuestion: CodingQuestion = {
      id: `code-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      difficulty: formData.difficulty as 'easy' | 'medium' | 'hard',
      category: formData.category || 'Arrays',
      inputFormat: formData.inputFormat || '',
      outputFormat: formData.outputFormat || '',
      hints: formData.hints?.filter(h => h.trim()) || [],
      testCases: formData.testCases?.filter(tc => tc.input && tc.expectedOutput) || [],
      constraints: formData.constraints?.filter(c => c.trim()) || [],
      examples: formData.examples?.filter(ex => ex.input && ex.output) || [],
      topics: formData.topics?.filter(t => t.trim()) || [],
      starterCode: formData.starterCode!,
      timeLimit: formData.timeLimit || 30,
      memoryLimit: formData.memoryLimit || '256 MB'
    };

    onQuestionAdded(newQuestion);
    
    toast({
      title: 'Success!',
      description: 'Question added successfully',
    });

    setOpen(false);
    resetForm();
  };

  const addTestCase = () => {
    const newTestCaseId = `test-${(formData.testCases?.length || 0) + 1}`;
    setFormData({
      ...formData,
      testCases: [...(formData.testCases || []), { 
        id: newTestCaseId, 
        input: '', 
        expectedOutput: '', 
        isHidden: false, 
        weight: 1,
        description: '' 
      }]
    });
  };

  const removeTestCase = (index: number) => {
    setFormData({
      ...formData,
      testCases: formData.testCases?.filter((_, i) => i !== index)
    });
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    const updatedTestCases = [...(formData.testCases || [])];
    updatedTestCases[index] = { ...updatedTestCases[index], [field]: value };
    setFormData({ ...formData, testCases: updatedTestCases });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Coding Question</DialogTitle>
          <DialogDescription>
            Create a new coding practice question with test cases and solutions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Question Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Two Sum"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the problem in detail..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                    setFormData({ ...formData, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arrays">Arrays</SelectItem>
                    <SelectItem value="Strings">Strings</SelectItem>
                    <SelectItem value="Math">Mathematics</SelectItem>
                    <SelectItem value="Stack">Stack</SelectItem>
                    <SelectItem value="Trees">Binary Trees</SelectItem>
                    <SelectItem value="Dynamic Programming">Dynamic Programming</SelectItem>
                    <SelectItem value="Graph">Graph</SelectItem>
                    <SelectItem value="Sorting">Sorting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Test Cases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Test Cases
              </Label>
              <Button type="button" size="sm" variant="outline" onClick={addTestCase}>
                <Plus className="h-3 w-3 mr-1" />
                Add Test Case
              </Button>
            </div>

            {formData.testCases?.map((testCase, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => removeTestCase(index)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="text-sm font-medium">Test Case {index + 1}</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Input</Label>
                    <Input
                      value={testCase.input}
                      onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                      placeholder="e.g., 2,7,11,15|9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Expected Output</Label>
                    <Input
                      value={testCase.expectedOutput}
                      onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                      placeholder="e.g., 0,1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Description (Optional)</Label>
                  <Input
                    value={testCase.description || ''}
                    onChange={(e) => updateTestCase(index, 'description', e.target.value)}
                    placeholder="Explain the test case..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Hints */}
          <div className="space-y-3">
            <Label>Hints (Optional)</Label>
            {formData.hints?.map((hint, index) => (
              <Input
                key={index}
                value={hint}
                onChange={(e) => {
                  const updatedHints = [...(formData.hints || [])];
                  updatedHints[index] = e.target.value;
                  setFormData({ ...formData, hints: updatedHints });
                }}
                placeholder={`Hint ${index + 1}`}
              />
            ))}
          </div>

          {/* Starter Code */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Starter Code (JavaScript)
            </Label>
            <Textarea
              value={formData.starterCode?.javascript}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  starterCode: { ...formData.starterCode!, javascript: e.target.value }
                })
              }
              rows={5}
              className="font-mono text-sm"
            />
          </div>

          {/* Constraints */}
          <div className="space-y-3">
            <Label>Constraints (Optional)</Label>
            <Input
              value={formData.constraints?.[0] || ''}
              onChange={(e) => setFormData({ ...formData, constraints: [e.target.value] })}
              placeholder="e.g., 1 <= nums.length <= 10^4"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddQuestionDialog;