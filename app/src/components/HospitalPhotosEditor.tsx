import { useState } from "react";
import { Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { command } from "../lib/api";
import { Action, Card, Copy, Notice, s } from "./ui";
export function HospitalPhotosEditor() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload() {
    try {
      setMessage("");
      const selection = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (selection.canceled) return;
      const file = selection.assets[0];
      if ((file.size ?? 0) > 3 * 1024 * 1024) {
        setMessage("Choose an image smaller than 3 MB.");
        return;
      }
      setBusy(true);
      const blob = await (await fetch(file.uri)).blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await command("/manage/photos", { mime: file.mimeType, base64 })();
      setMessage("Photo added to your hospital.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text style={s.heading}>Hospital photos</Text>
      <Copy>
        Add exterior, reception and facility photos. JPEG or PNG, up to 3 MB
        each.
      </Copy>
      <Notice text={message} />
      <Action
        title="Add photo"
        loading={busy}
        onPress={() => void upload()}
      />
    </Card>
  );
}
