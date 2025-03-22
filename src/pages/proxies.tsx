import { useEffect, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { Box, Button, ButtonGroup } from "@mui/material";
import { closeAllConnections } from "@/services/api";
import { patchClashMode, getCurrentClashMode } from "@/services/cmds";
import { useVerge } from "@/hooks/use-verge";
import { BasePage } from "@/components/base";
import { ProxyGroups } from "@/components/proxy/proxy-groups";
import { ProviderButton } from "@/components/proxy/provider-button";
import { listen } from "@tauri-apps/api/event";

const ProxyPage = () => {
  const { t } = useTranslation();
  const { verge } = useVerge();
  const [currentMode, setCurrentMode] = useState<string | undefined>(undefined);

  const modeList = ["rule", "global", "direct"];

  // 获取当前模式的函数
  const fetchMode = async () => {
    try {
      const mode = await getCurrentClashMode();
      setCurrentMode(mode);
    } catch (error) {
      console.error("获取代理模式失败:", error);
      setCurrentMode("rule"); // 失败时默认为rule模式
    }
  };

  // 初始加载以及后续更新当前模式
  useEffect(() => {
    let mounted = true;

    const loadMode = async () => {
      try {
        const mode = await getCurrentClashMode();
        if (mounted) {
          setCurrentMode(mode);
        }
      } catch (error) {
        console.error("获取代理模式失败:", error);
        if (mounted) {
          setCurrentMode("rule"); // 失败时默认为rule模式
        }
      }
    };

    loadMode();

    // 监听Clash配置刷新事件，当配置刷新时重新获取模式
    const unlisten = listen("verge://refresh-clash-config", () => {
      if (mounted) {
        console.log("Proxies Page: Received refresh-clash-config event, updating mode...");
        loadMode();
      }
    });

    // 清理函数
    return () => {
      mounted = false;
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, []);

  // 模式不在支持列表中时，切换到规则模式
  useEffect(() => {
    if (currentMode && !modeList.includes(currentMode)) {
      onChangeMode("rule");
    }
  }, [currentMode]);

  const onChangeMode = useLockFn(async (mode: string) => {
    // 断开连接
    if (mode !== currentMode && verge?.auto_close_connection) {
      closeAllConnections();
    }
    
    // 立即更新UI状态，提高响应性
    setCurrentMode(mode);
    
    try {
      await patchClashMode(mode);
      // patchClashMode会触发事件，通知其他组件刷新
    } catch (error) {
      console.error("修改代理模式失败:", error);
      // 失败时重新获取正确的模式
      fetchMode();
    }
  });

  return (
    <BasePage
      full
      contentStyle={{ height: "101.5%" }}
      title={t("Proxy Groups")}
      header={
        <Box display="flex" alignItems="center" gap={1}>
          <ProviderButton />

          <ButtonGroup size="small">
            {modeList.map((mode) => (
              <Button
                key={mode}
                variant={mode === currentMode ? "contained" : "outlined"}
                onClick={() => onChangeMode(mode)}
                sx={{ textTransform: "capitalize" }}
              >
                {t(mode)}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
      }
    >
      <ProxyGroups mode={currentMode || "rule"} />
    </BasePage>
  );
};

export default ProxyPage;
