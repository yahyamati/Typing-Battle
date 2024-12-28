"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "@/components/ui/button";
import { useCounter } from "@/hooks/useCounter";
import { BadgeCheck } from "lucide-react";
import "../app/globals.css";
import TypingCmp from "../components/TypingCmp";
import TimerDisplay from "../components/TimerDisplay";
import OpponentStats from "../components/OpponentStats";
import { toast } from "@/hooks/use-toast";

const socket = io("http://localhost:4000", {
  transports: ["websocket"],
});

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface RoomData {
  id: string;
  players: Player[];
  status: string;
  ready: String[];
}

export default function TypingRoom() {
  const searchParams = useSearchParams();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isReady, setIsReady] = useState<Boolean>(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentStats, setOpponentStats] = useState<{
    playerName: string;
    wpm: number;
    accuracy: number;
    errors: number;
  } | null>(null);
  const {
    toggleStart,
    toggleReset,
    toggleStop,
    Counter,
    isRunning,
    setIsRunning,
  } = useCounter(10);
  const roomId = searchParams?.get("roomId");
  console.log("roomId", roomId);
  useEffect(() => {
    const storedPlayerId = localStorage.getItem("playerId");
    setPlayerId(storedPlayerId);
    console.log("playerId from localstorage in typing room", storedPlayerId);
  }, []);
  const playerName = searchParams?.get("playerName");
  console.log("playerName", playerName);

  // Fucntion to handle player ready and emit it to server
  const handleReady = () => {
    socket.emit("playerReady", { playerId, roomId });
    alert("You are ready");
  };

  interface ToastOptions {
    title: string;
    description?: string | null;
    variant: "default" | "destructive" | null | undefined;
  }

  const showToast = (message: string, type: "default" | "destructive" | null | undefined): void => {
    const options: ToastOptions = {
      title: message,
      description: type === "default" ? "success!" : null,
      variant: type,
    };
    toast(options);
  };

  useEffect(() => {
    if (!roomId || !playerId || !playerName) {
      console.error(`Missing required parameters for TypingRoom ${roomId} , ${playerId} , ${playerName} `);
      return;
    }
    else {
      console.log(`TypingRoom ${roomId} , ${playerId} , ${playerName} `);
    }
    // First check if room exists
    socket.emit("getRoomData", { roomId });

    console.log("RoomData", roomData)

    socket.on("roomData", (data) => {
        console.log('Received room data:', data);
      if (!data) {
        // Room doesn't exist, create it
        console.log("Creating new room:", roomId);
        socket.emit("createRoom", { roomName: roomId, playerName, playerId });
      } else if (!data.players.find((p: Player) => p.id === playerId)) {
        // Room exists and player is not in it, try to join
        console.log("Joining existing room:", roomId);
        socket.emit("joinRoom", { roomName: roomId, playerName, playerId });
      }
      console.log("Setting room data: (1)", data);
      setRoomData(data);
    });

    socket.on("roomCreated", (data) => {
      console.log("Room created:", data);
      setRoomData({
        id: data.roomId,
        players: [
          {
            id: data.playerId,
            name: data.playerName,
            isHost: true,
          },
        ],
        ready: [],
        status: "waiting",
      });
    });

    socket.on("playerJoined", ({ roomId: updatedRoomId, players }) => {
      console.log("Player joined:", players);
      if (updatedRoomId === roomId) {
        console.log("Setting room data: (2)", players);
        setRoomData((prev) => ({
          ...prev!,
          players: players,
        }));
        showToast("Player joined", "default");
      }
    });
    // Check if players size is 2 and players are ready
    if (
      roomData?.players.length! >= 2 &&
      roomData?.ready.length! >= 2 &&
      roomData?.status == "running"
    ) {
      
      setTimeout(() => {
        toggleStart();
      }, 2000);
    }

    socket.on(
      "playerStats",
      ({ playerId: statsPlayerId, playerName: statsPlayerName, stats }) => {
        if (statsPlayerId !== playerId) {
          // Only update if it's the opponent's stats
          setOpponentStats({
            playerName: statsPlayerName,
            ...stats,
          });
        }
      }
    );

    socket.on("reconnect", () => {
      console.log("Player reconnected to the room");
      socket.emit("getRoomData", { roomId });
      showToast("Player reconnected to the room", "default");
    });

    socket.on("playerDisconnected", ({ playerId: disconnectedPlayerId }) => {
      
      setRoomData((prev) => {
        if (!prev) return null;

        // If the disconnected player was the host, make the first remaining player the host
        const remainingPlayers = prev.players.filter(
          (p) => p.id !== disconnectedPlayerId
        );
        if (
          remainingPlayers.length > 0 &&
          prev.players.find((p) => p.id === disconnectedPlayerId)?.isHost
        ) {
          remainingPlayers[0].isHost = true;
        }

        return {
          ...prev,
          players: remainingPlayers,
        };
      });
      console.log("Player disconnected:", disconnectedPlayerId);
      showToast("Player disconnected", "destructive");
    });

    // Listen for player ready event and update roomData with new data
    socket.on("playerReady", (updatedRoomData) => {
      console.log("Updated room data from server:", updatedRoomData);
      setRoomData(updatedRoomData); // Room data is updated based on the server response
    });

    return () => {
      socket.off("playerJoined");
      socket.off("roomData");
      socket.off("roomCreated");
      socket.off("playerStats");
      socket.off("playerDisconnected");
      socket.off("playerReady");
      socket.off("reconnect");
    };
  }, [roomId, playerId, playerName, JSON.stringify(roomData?.players), roomData?.status]);

  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/bg.jpg')] bg-cover bg-center">
        <div className="text-white text-2xl">Loading room data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('/bg.jpg')] bg-cover bg-center">
      <Card className="w-full h-screen bg-purple-400 px-7 rounded-md bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-10 border-none">
        {opponentStats && <OpponentStats {...opponentStats} />}
        <CardHeader>
          <CardTitle className="text-white text-5xl text-center">
            Room: {roomId}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-white">

            <TimerDisplay counter={Counter} status={roomData?.status} />
          
              <h2 className="text-4xl font-semibold mb-2 text-center">
                Status : {roomData.status}
              </h2>
              <h3 className="text-4xl font-semibold mb-2 text-center">
                Players:
              </h3>
              <div className="flex items-center justify-center gap-8">
                {roomData.players.map((player, index) => (
                  <div className="flex items-center justify-center gap-8" key={player.id}>
                    <div
                      key={player.id}
                      className={`p-3 rounded-md w-64 ${
                        player.id === playerId
                          ? "bg-green-500 bg-opacity-20"
                          : "bg-purple-500 bg-opacity-20"
                      }`}
                    >
                      <p className="font-bold flex justify-between items-center text-2xl text-center">
                        {player.name}
                        {player.isHost ? "(Host)" : ""}
                        <span>
                          {roomData.ready.includes(player.id) ? (
                            <BadgeCheck color="#54B435" />
                          ) : (
                            player.id === playerId && (
                              <Button
                                className="bg-yellow-400"
                                onClick={handleReady}
                              >
                                Ready
                              </Button>
                            )
                          )}
                        </span>
                      </p>
                    </div>
                    {index === 0 && roomData.players.length > 1 && (
                      <div className="text-4xl font-bold">VS</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {roomData.ready.length >= 2 ? (
            <TypingCmp socket={socket} roomId={roomId!} playerId={playerId!} />
          ) : (
            <div className="flex mt-[50px] items-center justify-center">
              <div className="text-white text-2xl">
                Waiting for players to ready .. {roomData.ready.length}/2
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}