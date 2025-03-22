import { useTranslation } from "react-i18next";
import { Box, Typography, Paper, Stack, Fade } from "@mui/material";
import { useLockFn } from "ahooks";
import { closeAllConnections } from "@/services/api";
import { patchClashMode, getCurrentClashMode } from "@/services/cmds";
import { useVerge } from "@/hooks/use-verge";
import {
  LanguageRounded,
  MultipleStopRounded,
  DirectionsRounded,
} from "@mui/icons-material";
import { useState, useEffect, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";

export const ClashModeCard = () => {
  const { t } = useTranslation();
  const { verge } = useVerge();

  // 支持的模式列表
  const modeList = useMemo(() => ["rule", "global", "direct"] as const, []);

  // 使用undefined作为初始状态，表示正在加载中
  const [localMode, setLocalMode] = useState<string | undefined>(undefined);

  // 获取当前模式的函数
  const fetchMode = async () => {
    try {
      const mode = await getCurrentClashMode();
      setLocalMode(mode);
    } catch (error) {
      console.error("获取代理模式失败:", error);
      setLocalMode("rule"); // 失败时默认为rule模式
    }
  };

  // 直接从后端获取当前模式，不使用SWR
  useEffect(() => {
    let mounted = true;
    
    const loadMode = async () => {
      try {
        const mode = await getCurrentClashMode();
        if (mounted) {
          setLocalMode(mode);
        }
      } catch (error) {
        console.error("获取代理模式失败:", error);
        if (mounted) {
          setLocalMode("rule"); // 失败时默认为rule模式
        }
      }
    };
    
    loadMode();
    
    // 监听Clash配置刷新事件，当配置刷新时重新获取模式
    const unlisten = listen("verge://refresh-clash-config", () => {
      if (mounted) {
        console.log("Received refresh-clash-config event, updating mode...");
        loadMode();
      }
    });
    
    // 清理函数
    return () => {
      mounted = false;
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, []);

  // 模式图标映射
  const modeIcons = useMemo(() => ({
    rule: <MultipleStopRounded fontSize="small" />,
    global: <LanguageRounded fontSize="small" />,
    direct: <DirectionsRounded fontSize="small" />
  }), []);

  // 切换模式的处理函数
  const onChangeMode = useLockFn(async (mode: string) => {
    if (mode === localMode) return;
    
    setLocalMode(mode);
    
    if (verge?.auto_close_connection) {
      closeAllConnections();
    }

    try {
      await patchClashMode(mode);
    } catch (error) {
      console.error("Failed to change mode:", error);
      // 切换失败时，重新获取当前模式
      fetchMode();
    }
  });

  // 按钮样式
  const buttonStyles = (mode: string) => ({
    cursor: "pointer",
    px: 2,
    py: 1.2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    bgcolor: mode === localMode ? "primary.main" : "background.paper",
    color: mode === localMode ? "primary.contrastText" : "text.primary",
    borderRadius: 1.5,
    transition: "all 0.2s ease-in-out",
    position: "relative",
    overflow: "visible",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: 1,
    },
    "&:active": {
      transform: "translateY(1px)",
    },
    "&::after": mode === localMode
      ? {
          content: '""',
          position: "absolute",
          bottom: -16,
          left: "50%",
          width: 2,
          height: 16,
          bgcolor: "primary.main",
          transform: "translateX(-50%)",
        }
      : {},
  });

  // 描述样式
  const descriptionStyles = {
    width: "95%",
    textAlign: "center",
    color: "text.secondary",
    p: 0.8,
    borderRadius: 1,
    borderColor: "primary.main",
    borderWidth: 1,
    borderStyle: "solid",
    backgroundColor: "background.paper",
    wordBreak: "break-word",
    hyphens: "auto",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* 模式选择按钮组 */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 1,
          position: "relative",
          zIndex: 2,
        }}
      >
        {modeList.map((mode) => (
          <Paper
            key={mode}
            elevation={mode === localMode ? 2 : 0}
            onClick={() => onChangeMode(mode)}
            sx={buttonStyles(mode)}
          >
            {modeIcons[mode]}
            <Typography
              variant="body2"
              sx={{
                textTransform: "capitalize",
                fontWeight: mode === localMode ? 600 : 400,
              }}
            >
              {t(mode)}
            </Typography>
          </Paper>
        ))}
      </Stack>

      {/* 说明文本区域 */}
      <Box
        sx={{
          width: "100%",
          my: 1,
          position: "relative",
          display: "flex",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        <Fade in={true} timeout={200}>
          <Typography
            variant="caption"
            component="div"
            sx={descriptionStyles}
          >
            {t(`${localMode} Mode Description`)}
          </Typography>
        </Fade>
      </Box>
    </Box>
  );
};
