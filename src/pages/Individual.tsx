'use client'
import { useUser } from "@clerk/nextjs";
import TypingCmpInd from "../components/TypingCmpInd";
import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Keyboard, Loader2, Type } from "lucide-react";
import { ClerkProvider } from "@clerk/nextjs";
import {phrases} from "@/config/phrases"
import {commonWords} from "@/config/words"
const Individual = () => {
  

  type LengthType = 'short' | 'medium' | 'long';

  type TextType = 'words' | 'phrases';

  const [settings, setSettings] = useState<{
    type: TextType;
    length: LengthType;
  }>({
    type: "phrases", // 'words' or 'phrases'
    length: "medium", // 'short', 'medium', 'long'
  });
  
  const [randomText, setRandomText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [reset, setReset] = useState(false);
  interface GenerateWordTextParams {
    count: number;
  }

  const generateWordText = ({ count }: GenerateWordTextParams): string => {
    const selectedWords: string[] = [];
    const usedIndices: Set<number> = new Set();
    
    // Keep selecting words until we reach the desired count
    while (selectedWords.length < count) {
      const randomIndex: number = Math.floor(Math.random() * commonWords.length);
      
      // Avoid immediate word repetition
      if (!usedIndices.has(randomIndex)) {
        selectedWords.push(commonWords[randomIndex]);
        usedIndices.add(randomIndex);
        
        // Reset usedIndices if we're running out of unique words
        if (usedIndices.size === commonWords.length) {
          usedIndices.clear();
        }
      }
    }
    
    return selectedWords.join(" ");
  };
  const generateRandomText = () => {
    setReset(true);
    setIsAnimating(true);
    
    let selectedText = "";
    
    if (settings.type === "words") {
      const wordCounts = {
        short: 15,
        medium: 30,
        long: 50
      };
      selectedText = generateWordText({ count: wordCounts[settings.length] });
    } else {
      const availablePhrases = phrases[settings.length];
      if (availablePhrases && availablePhrases.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePhrases.length);
        selectedText = availablePhrases[randomIndex];
      } else {
        selectedText = "No phrases available for the selected length.";
      }
    }
    
    setTimeout(() => {
      setRandomText(selectedText);
      setIsAnimating(false);
      setReset(false);
    }, 500);
  };



  const { isSignedIn, user, isLoaded } = useUser();
  const [, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isLoaded) {
    return (
      <ClerkProvider>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-lg text-gray-200">Loading your practice session...</p>
          </div>
        </div>
      </ClerkProvider>
    );
  }

  if (!isSignedIn) {
    return (
      <ClerkProvider>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Card className="p-8 text-center">
            <Type className="w-12 h-12 mx-auto mb-4 text-accent" />
            <h2 className="text-xl font-semibold mb-2">Access Required</h2>
            <p className="text-gray-400">Please sign in to access the typing practice</p>
          </Card>
        </div>
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider>
      <div className="flex flex-col items-center gap-8">
        <Card className="w-full max-w-4xl p-6 bg-black/40 backdrop-blur-sm border-none">
          <div className="flex flex-col items-center gap-6">
            {/* Settings Panel */}
            <div className="flex gap-4 w-full max-w-md justify-center">
                <Select
                value={settings.type}
                onValueChange={(value: string) => setSettings(prev => ({ ...prev, type: value as 'words' | 'phrases' }))}
                >
                <SelectTrigger className="w-[180px] text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="words">Words</SelectItem>
                  <SelectItem value="phrases">Phrases</SelectItem>
                </SelectContent>
                </Select>

                <Select
                value={settings.length}
                onValueChange={(value: string) => setSettings(prev => ({ ...prev, length: value as LengthType }))}
                >
                <SelectTrigger className="w-[180px] text-white">
                  <SelectValue placeholder="Length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <Button
              onClick={generateRandomText}
              disabled={isAnimating}
              className="group relative flex items-center gap-2 bg-accent text-black hover:text-accent text-xl py-6 px-8 transition-all duration-300 hover:shadow-lg"
            >
              <Keyboard className="w-6 h-6 transition-transform group-hover:scale-110" />
              {isAnimating ? (
                <span className="flex items-center gap-2">
                  Generating <Loader2 className="w-4 h-4 animate-spin" />
                </span>
              ) : (
                "Generate New Text"
              )}
            </Button>

            {randomText ? (
              <TypingCmpInd
                userId={user.id}
                playerId={user?.fullName || ""}
                counter={0}
                sampleText={randomText}
                tozero={reset}
              />
            ) : (
              <div className="text-center p-8 text-gray-400">
                <Type className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click the button above to generate a text and start practicing</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </ClerkProvider>
  );
};

export default Individual;

export async function getServerSideProps() {
  return { props: {} };
}