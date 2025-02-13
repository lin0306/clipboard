#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QListWidget>

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);

private slots:
    void copyToClipboard();
    void pasteFromClipboard();
    void clipboardChanged(); // 添加 clipboardChanged 的声明

private:
    QListWidget *historyList; // 声明 historyList
    void updateHistoryList(const QString &text); // 添加这一行
};

#endif // MAINWINDOW_H
