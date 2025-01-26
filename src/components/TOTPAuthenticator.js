import React, { useState, useEffect, useCallback } from "react";
import { Shield, UserCircle, Plus, Image as ImageIcon } from "lucide-react";
import jsQR from "jsqr";

const TOTPAuthenticator = () => {
  const [secretId, setSecretId] = useState(null);
  const [token, setToken] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [localTimer, setLocalTimer] = useState(null);
  const [error, setError] = useState(null);
  const [isPasting, setIsPasting] = useState(false);

  useEffect(() => {
    let timerInterval;
    if (timeRemaining !== null) {
      setLocalTimer(timeRemaining);
      timerInterval = setInterval(() => {
        setLocalTimer((prev) => {
          if (prev <= 0) return timeRemaining;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [timeRemaining]);

  const processImage = async (imageData) => {
    try {
      const img = new Image();
      img.src = imageData;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);

      const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, canvas.width, canvas.height);

      if (!code) {
        throw new Error("No QR code found in image");
      }

      const response = await fetch(
        "http://localhost:7071/api/accounts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uri: code.data }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSecretId(data.secretName);
      setToken({
        issuer: data.issuer,
        accountName: data.accountName,
        code: "--",
      });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPasting(false);
    }
  };

  const handlePaste = useCallback(async (e) => {
    e.preventDefault();
    setIsPasting(true);
    setError(null);

    try {
      const items = e.clipboardData.items;
      const imageItem = Array.from(items).find((item) =>
        item.type.startsWith("image/")
      );

      if (!imageItem) {
        throw new Error("No image found in clipboard");
      }

      const blob = imageItem.getAsFile();
      const reader = new FileReader();

      reader.onload = async (event) => {
        await processImage(event.target.result);
      };

      reader.onerror = () => {
        setError("Failed to read image");
        setIsPasting(false);
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      setError(err.message);
      setIsPasting(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsPasting(true);
    setError(null);

    try {
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) {
        throw new Error("Please drop an image file");
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        await processImage(event.target.result);
      };

      reader.onerror = () => {
        setError("Failed to read image");
        setIsPasting(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setIsPasting(false);
    }
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  useEffect(() => {
    let interval;

    const fetchToken = async () => {
      try {
        const response = await fetch(
          `http://localhost:7071/api/tokens?id=${secretId}`
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setToken((prevToken) => ({
          ...prevToken,
          code: data.token,
        }));
        setTimeRemaining(data.timeRemaining);

        const nextFetchDelay = data.timeRemaining * 1000 || 30000;
        interval = setTimeout(fetchToken, nextFetchDelay);
      } catch (err) {
        setError(err.message);
        interval = setTimeout(fetchToken, 30000);
      }
    };

    if (secretId) {
      fetchToken();
    }

    return () => clearTimeout(interval);
  }, [secretId]);

  if (!secretId) {
    return (
      <div className="w-[416px] max-w-full mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-[#0078D4] p-4 text-white flex items-center gap-2">
          <Shield className="mt-px" size={24} />
          <h2 className="text-xl font-semibold m-0">My Authenticator</h2>
        </div>
        <div className="p-6">
          <div
            className={`w-full p-10 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer transition-all duration-200 ${
              isPasting ? "bg-gray-100" : "bg-white"
            }`}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            tabIndex={0}
          >
            <ImageIcon size={32} className="text-gray-600 mx-auto" />
            <p className="text-gray-600 mt-3 text-sm">
              {isPasting ? "Processing..." : "Paste or drop QR code here"}
            </p>
          </div>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[416px] max-w-full mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-[#0078D4] p-4 text-white flex items-center gap-2">
        <Shield className="mt-px" size={24} />
        <h2 className="text-xl font-semibold m-0">My Authenticator</h2>
      </div>
      <div className="flex items-center p-4 border-b">
        <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center mr-4">
          <UserCircle size={24} className="text-gray-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-800 m-0">
            {token?.issuer || "--"}
          </h3>
          <p className="text-sm text-gray-600 mt-1 m-0">
            {token?.accountName || "--"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-medium text-gray-800 m-0 mb-0.5">
            {token?.code || "--"}
          </p>
          <p className="text-xs text-gray-600 m-0">
            {localTimer || "--"} seconds
          </p>
        </div>
      </div>
      <div className="p-6">
        <div
          className={`w-full p-10 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer transition-all duration-200 ${
            isPasting ? "bg-gray-100" : "bg-white"
          }`}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          tabIndex={0}
        >
          <ImageIcon size={32} className="text-gray-600 mx-auto" />
          <p className="text-gray-600 mt-3 text-sm">
            {isPasting ? "Processing..." : "Paste or drop QR code here"}
          </p>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
};

export default TOTPAuthenticator;
