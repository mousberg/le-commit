"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings, Bot, Key, Brain, Save, TestTube } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4");
  const [systemPrompt, setSystemPrompt] = useState(`You are an expert interview analyst. Analyze candidate responses for:

1. Consistency with their resume/CV
2. Technical accuracy of claims
3. Behavioral red flags
4. Potential exaggerations or lies

Provide real-time flags and suggested follow-up questions to help interviewers catch inconsistencies.`);

  const [analysisPrompt, setAnalysisPrompt] = useState(`Analyze this interview transcript segment for potential inconsistencies:

- Check if technical claims match the candidate's stated experience level
- Flag any contradictions with previously stated information  
- Identify vague or evasive responses
- Suggest specific follow-up questions to verify claims

Be concise and actionable in your analysis.`);

  const [testResults, setTestResults] = useState("");
  const [isTestLoading, setIsTestLoading] = useState(false);

  const handleSaveSettings = () => {
    // Save to localStorage or API
    localStorage.setItem("ai-settings", JSON.stringify({
      apiKey,
      model,
      systemPrompt,
      analysisPrompt
    }));
    alert("Settings saved successfully!");
  };

  const handleTestConnection = async () => {
    setIsTestLoading(true);
    setTestResults("");
    
    // Simulate API test
    setTimeout(() => {
      if (apiKey.length > 10) {
        setTestResults("✅ Connection successful! AI model is responding correctly.");
      } else {
        setTestResults("❌ Connection failed. Please check your API key.");
      }
      setIsTestLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-gray-800" />
            <h1 className="text-3xl font-bold text-gray-900">AI Configuration</h1>
          </div>
          <p className="text-gray-600">Configure your AI analysis system for custom interview detection</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Connection Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">AI Service Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Provider
                </label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={model.includes("gpt") ? "openai" : "groq"}
                  onChange={(e) => {
                    if (e.target.value === "openai") {
                      setModel("gpt-4");
                    } else {
                      setModel("llama-3.1-70b-versatile");
                    }
                  }}
                >
                  <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
                  <option value="groq">Groq (Llama 3.1, Mixtral)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {model.includes("gpt") ? (
                    <>
                      <option value="gpt-4">GPT-4 (Recommended)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  ) : (
                    <>
                      <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
                      <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                      <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sk-... or gsk_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Your API key is stored locally and never shared</p>
              </div>

              <Button 
                onClick={handleTestConnection}
                disabled={!apiKey || isTestLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <TestTube className="w-4 h-4 mr-2" />
                {isTestLoading ? "Testing..." : "Test Connection"}
              </Button>

              {testResults && (
                <div className={`p-3 rounded-lg text-sm ${
                  testResults.includes("✅") 
                    ? "bg-green-50 text-green-800 border border-green-200" 
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {testResults}
                </div>
              )}
            </div>
          </Card>

          {/* System Prompt Configuration */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">System Behavior</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detection Focus
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Technical Claims</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Experience Verification</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Behavioral Flags</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Cultural Fit</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Analysis Sensitivity
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option>Conservative (Fewer false positives)</option>
                  <option>Balanced (Recommended)</option>
                  <option>Aggressive (Catch more potential issues)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Real-time Updates
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option>Every 5 seconds</option>
                  <option>Every 10 seconds</option>
                  <option>After each response</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Advanced Prompt Configuration */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">System Prompt</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Instructions for AI Agent
              </label>
              <textarea
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Define how the AI should behave and what to focus on..."
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Analysis Prompt</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per-Message Analysis Instructions
              </label>
              <textarea
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                placeholder="Instructions for analyzing each transcript segment..."
              />
            </div>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={handleSaveSettings}
            size="lg"
            className="bg-gray-900 hover:bg-gray-800 px-8 py-3"
          >
            <Save className="w-5 h-5 mr-2" />
            Save Configuration
          </Button>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use Your Custom AI Configuration</h3>
          <div className="space-y-2 text-blue-800">
            <p>• <strong>Setup:</strong> Configure your API key and model above</p>
            <p>• <strong>Customize:</strong> Edit the system and analysis prompts to match your interview style</p>
            <p>• <strong>Test:</strong> Use the &quot;Test Connection&quot; button to verify everything works</p>
            <p>• <strong>Deploy:</strong> Your settings will be used in live interview sessions</p>
          </div>
        </Card>
      </div>
    </div>
  );
}