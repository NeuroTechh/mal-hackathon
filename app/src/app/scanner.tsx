import {
  Input as TextInput,
  Action,
  Card,
  Copy,
  Notice,
  Page,
  Title,
  s,
} from "../components/ui";
import { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { command } from "../lib/api";
export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  async function verify(value: string) {
    setScanning(false);
    setBusy(true);
    try {
      const result = await command<{ message: string; patient: string }>(
        "/scan",
        { token: value },
      )();
      setMessage(`${result.message}: ${result.patient}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid pass");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Title>Patient check-in</Title>
      <Copy>Scan the patient’s QR pass or paste its code.</Copy>
      <Notice text={message} />
      {scanning && permission?.granted ? (
        <CameraView
          style={{ height: 300 }}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            if (scanning && !busy) void verify(data);
          }}
        />
      ) : (
        <Action
          title="Open camera"
          disabled={busy}
          onPress={() => {
            if (!permission?.granted) {
              void requestPermission().then((p) => setScanning(p.granted));
            } else setScanning(true);
          }}
        />
      )}
      <Card>
        <TextInput
          style={s.input}
          placeholder="Pass code"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
        />
        <Action
          title="Verify and check in"
          disabled={busy || !token}
          onPress={() => void verify(token)}
        />
      </Card>
    </Page>
  );
}
