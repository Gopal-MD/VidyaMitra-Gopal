import { useState, useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import type * as Monaco_Editor from 'monaco-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  RotateCcw, 
  Download, 
  Copy, 
  Check,
  Code2,
  Settings
} from 'lucide-react';
import { ProgrammingLanguage, SUPPORTED_LANGUAGES, getLanguageConfig } from '@/types/coding';
import { useToast } from '@/components/ui/use-toast';

interface CodeEditorProps {
  code: string;
  language: ProgrammingLanguage;
  onChange: (code: string) => void;
  onLanguageChange: (language: ProgrammingLanguage) => void;
  onRun: () => void;
  onSubmit: () => void;
  onReset: () => void;
  isRunning: boolean;
  readOnly?: boolean;
  height?: string;
}

export const CodeEditor = ({
  code,
  language,
  onChange,
  onLanguageChange,
  onRun,
  onSubmit,
  onReset,
  isRunning,
  readOnly = false,
  height = '500px'
}: CodeEditorProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const editorRef = useRef<Monaco_Editor.editor.IStandaloneCodeEditor | null>(null);

  const langConfig = getLanguageConfig(language);

  const handleEditorDidMount = (editor: Monaco_Editor.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    // Focus editor
    editor.focus();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: 'Code copied!',
        description: 'Code has been copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy code to clipboard',
        variant: 'destructive'
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solution${langConfig.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded!',
      description: `Code saved as solution${langConfig.extension}`,
    });
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
      toast({
        title: 'Code formatted',
        description: 'Your code has been formatted',
      });
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-sm dark:border-gray-700">
      <CardHeader className="pb-3 border-b bg-gray-50/50 dark:bg-gray-900/60 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded">
              <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Code Editor</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Write your solution below</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <Select value={language} onValueChange={(val) => onLanguageChange(val as ProgrammingLanguage)}>
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Font Size */}
            <Select value={fontSize.toString()} onValueChange={(val) => setFontSize(Number(val))}>
              <SelectTrigger className="w-[70px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12px</SelectItem>
                <SelectItem value="14">14px</SelectItem>
                <SelectItem value="16">16px</SelectItem>
                <SelectItem value="18">18px</SelectItem>
              </SelectContent>
            </Select>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
              className="h-8 px-2"
            >
              <span className="text-base">{theme === 'vs-dark' ? '🌙' : '☀️'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Editor */}
        <div className="flex-1 border-b dark:border-gray-700">
          <Editor
            height="100%"
            language={langConfig.monacoId}
            value={code}
            onChange={(value) => onChange(value || '')}
            onMount={handleEditorDidMount}
            theme={theme}
            options={{
              minimap: { enabled: false },
              fontSize: fontSize,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: readOnly,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: false,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: { enabled: true },
              folding: true,
              lineDecorationsWidth: 5,
              lineNumbersMinChars: 3,
              glyphMargin: false,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false,
                verticalScrollbarSize: 12,
                horizontalScrollbarSize: 12
              },
              padding: { top: 12, bottom: 12 }
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/60 border-t dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            
            <Button
              onClick={handleFormat}
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 text-xs"
            >
              <Settings className="h-3.5 w-3.5" />
              Format
            </Button>
            
            <Button
              onClick={onReset}
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950/50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={onRun}
              variant="outline"
              size="sm"
              disabled={isRunning}
              className="gap-1.5 h-9 px-4 font-medium"
            >
              <Play className="h-4 w-4" />
              Run Code
            </Button>
            
            <Button
              onClick={onSubmit}
              size="sm"
              disabled={isRunning}
              className="gap-1.5 h-9 px-5 font-medium bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4" />
              Submit
            </Button>
          </div>
        </div>


      </CardContent>
    </Card>
  );
};
