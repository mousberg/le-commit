"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Github, Linkedin, FileText, Check } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  connected: boolean;
}

const integrations = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect repositories and activity',
    icon: <Github className="w-5 h-5" />,
    color: 'bg-gray-800',
    placeholder: 'github.com/username'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Import work history and connections',
    icon: <Linkedin className="w-5 h-5" />,
    color: 'bg-blue-600',
    placeholder: 'linkedin.com/in/username'
  },
  {
    id: 'cv',
    name: 'CV/Resume',
    description: 'Upload CV for education & experience',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-green-600',
    placeholder: 'Upload PDF or enter manually'
  }
];

const videoCallPlatforms = [
  { name: 'Google Meet', placeholder: 'meet.google.com/xyz-abcd-123' },
  { name: 'Microsoft Teams', placeholder: 'teams.microsoft.com/l/meetup-join/...' },
  { name: 'Zoom', placeholder: 'zoom.us/j/123456789' },
  { name: 'Other', placeholder: 'Enter video call URL' }
];

export default function SetupPage() {
  const router = useRouter();
  const [connectedIntegrations, setConnectedIntegrations] = useState<Integration[]>([]);
  const [inputValues, setInputValues] = useState<{[key: string]: string}>({});
  const [videoCallUrl, setVideoCallUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('Google Meet');

  const isConnected = (id: string) => {
    return connectedIntegrations.some(i => i.id === id);
  };

  const handleToggleIntegration = (id: string) => {
    if (isConnected(id)) {
      setConnectedIntegrations(prev => prev.filter(i => i.id !== id));
      setInputValues(prev => ({ ...prev, [id]: '' }));
    } else {
      setConnectedIntegrations(prev => [...prev, { id, name: integrations.find(i => i.id === id)?.name || '', connected: true }]);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setInputValues(prev => ({ ...prev, [id]: value }));
  };

  const canProceed = connectedIntegrations.length > 0 && videoCallUrl.trim() !== '';

  const handleProceed = () => {
    if (canProceed) {
      // In a real app, we'd pass the video call URL and start the overlay
      router.push('/overlay');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-medium text-gray-900">Setup NerdBuster</h2>
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-6 text-center">
            Connect candidate data sources and video call for analysis
          </p>

          {/* User Profile Integration */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-medium text-blue-900">Connected to User Profile</h3>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• Profile ID: usr_abc123xyz</p>
              <p>• AI Settings: Loaded from profile</p>
              <p>• Data Sources: Synced automatically</p>
            </div>

          </div>

          {/* Video Call URL Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Video Call URL
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {videoCallPlatforms.map((platform) => (
                <option key={platform.name} value={platform.name}>
                  {platform.name}
                </option>
              ))}
            </select>
            <input
              type="url"
              placeholder={videoCallPlatforms.find(p => p.name === selectedPlatform)?.placeholder || 'Enter video call URL'}
              value={videoCallUrl}
              onChange={(e) => setVideoCallUrl(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-4">
            {integrations.map((integration) => {
              const connected = isConnected(integration.id);

              return (
                <div key={integration.id} className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${integration.color} text-white flex items-center justify-center`}>
                        {integration.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-500">{integration.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleIntegration(integration.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        connected ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          connected ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {connected && (
                    <div className="ml-16 mr-4">
                      <input
                        type="text"
                        placeholder={integration.placeholder}
                        value={inputValues[integration.id] || ''}
                        onChange={(e) => handleInputChange(integration.id, e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              Connect at least one data source and add video call URL to start analysis
            </p>
          </div>

          <Button
            onClick={handleProceed}
            disabled={!canProceed}
            className="w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white disabled:bg-gray-300"
          >
            {canProceed ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Start Video Call Overlay
              </>
            ) : (
              'Add video URL and connect sources'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
